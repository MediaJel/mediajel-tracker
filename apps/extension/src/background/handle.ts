import { deployTargets } from "@mediajel/assistant-core/deploy/targets";
import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";

import { AuthState, JobPatch, JobView, Request, ResultOf } from "~/bridge/api";
import { BridgeDown } from "~/bridge/protocol";
import { answerChallenge, forgetPending, signIn } from "~/auth/cognito";
import { siteOf } from "~/lib/site";
import { checkAccess, deployTag, generateTag, readExistingTag } from "~/service/client";
import { clearSession, currentIdToken, readSession, writeSession } from "~/store/auth";
import { advance, clearAllJobs, deleteJob, listJobs, openJob, peekJob, resetJob, updateJob } from "~/store/jobs";
import { readSettings, writeSettings } from "~/store/settings";

/**
 * Every request the panel can make, in one switch.
 *
 * The shape is deliberate: each case does one thing and returns a value, and the caller in
 * `index.ts` turns a throw into `{ ok: false, error }`. That is what lets every failure in the
 * product — a wrong password, an expired session, a service that refused a tag — arrive at the
 * panel as one string written to be read, instead of as an exception someone has to interpret.
 */

/** The tracker status last reported by each tab's page bridge. Cheap to lose; re-asked on open. */
const statuses = new Map<number, TrackerStatus>();
export const rememberStatus = (tabId: number, status: TrackerStatus): void => {
  statuses.set(tabId, status);
};

/** In-flight generations, so Cancel has something to abort and a stale answer cannot land. */
const generating = new Map<number, AbortController>();

type Send = (tabId: number, message: BridgeDown) => boolean;
type Push = (tabId: number, message: unknown) => void;

const siteOfTab = async (tabId: number): Promise<string> => {
  const tab = await chrome.tabs.get(tabId);
  const site = siteOf(tab.url ?? "");
  if (!site) {
    throw new Error("This tab is not on a website the assistant can work with. Open the client's site first.");
  }
  return site;
};

const authState = async (challenge: AuthState["challenge"] = null): Promise<AuthState> => ({
  identity: (await readSession())?.identity ?? null,
  challenge,
});

const patchJob = (site: string, patch: JobPatch): void => {
  updateJob(site, (draft) => {
    switch (patch.op) {
      case "toggle-mark": {
        const index = draft.markedIds.indexOf(patch.id);
        if (index === -1) draft.markedIds.push(patch.id);
        else draft.markedIds.splice(index, 1);
        return;
      }
      case "clear-marks":
        draft.markedIds = [];
        draft.evidenceMode = "pinpoint";
        return;
      case "notes":
        draft.notes = patch.notes;
        return;
      case "evidence-mode":
        draft.evidenceMode = patch.mode;
        return;
      case "code":
        if (draft.generation) draft.generation = { ...draft.generation, code: patch.code, edited: true };
        return;
    }
  });
};

/**
 * One generation run. The step is already `generating` when this starts; success installs the
 * result and moves to `result`, failure returns the work order to Evidence with a message. A
 * cancel aborts the request, and a stale answer — checked by the controller still being the
 * current one — can never overwrite a newer state.
 */
const runGeneration = async (tabId: number, site: string, push: Push): Promise<void> => {
  const session = peekJob(site);
  if (!session) return;

  generating.get(tabId)?.abort();
  const controller = new AbortController();
  generating.set(tabId, controller);

  try {
    const { output, model, violations } = await generateTag(currentIdToken, {
      session,
      status: statuses.get(tabId) ?? emptyStatus(),
      hostname: site,
      signal: controller.signal,
    });
    if (generating.get(tabId) !== controller) return; // superseded

    updateJob(
      site,
      (draft) => {
        draft.generationError = undefined;
        draft.generation = {
          at: Date.now(),
          model,
          code: output.code,
          summary: output.summary,
          trigger: output.trigger,
          fieldCoverage: output.fieldCoverage,
          items: output.items,
          warnings: output.warnings,
          suggestedTarget: output.suggestedTarget,
          dedupKey: output.dedupKey,
          violations,
        };
      },
      { flush: true },
    );
    advance(site, "result");
  } catch (err) {
    if (generating.get(tabId) !== controller) return;
    const message = err instanceof Error ? err.message : String(err);
    if (message === "Cancelled.") return; // the cancel handler already moved the step
    updateJob(site, (draft) => {
      draft.generationError = message;
    });
    advance(site, "review");
    push(tabId, { type: "generation-error", message });
  } finally {
    if (generating.get(tabId) === controller) generating.delete(tabId);
  }
};

const emptyStatus = (): TrackerStatus => ({
  appId: "",
  environment: "",
  version: "",
  event: "",
  collector: "",
  tagPresent: false,
  trackTransPresent: false,
  optedOut: false,
  warnings: ["The assistant has not read this page's tag yet."],
});

const view = async (tabId: number): Promise<JobView> => {
  const site = await siteOfTab(tabId);
  return { site, session: await openJob(site), status: statuses.get(tabId) ?? null };
};

export const handle = async (request: Request, send: Send, push: Push): Promise<ResultOf[Request["type"]]> => {
  switch (request.type) {
    case "auth/session":
      return authState();

    case "auth/sign-in": {
      const result = await signIn(request.username.trim(), request.password);
      if (!result.done) return authState(result.challenge);
      await writeSession(result.session);
      return authState();
    }

    case "auth/answer": {
      const session = await answerChallenge(request.kind, request.answer.trim());
      await writeSession(session);
      return authState();
    }

    case "auth/sign-out":
      forgetPending();
      await clearSession();
      return authState();

    case "auth/check-access":
      return checkAccess(currentIdToken);

    case "settings/read":
      return readSettings();

    case "settings/write":
      return writeSettings(request.patch);

    case "job/open": {
      const tab = await chrome.tabs.get(request.tabId);
      const site = siteOf(tab.url ?? "");
      if (!site) return null;
      // Ask the page what it can see now rather than trusting a snapshot from a page-load ago;
      // a tag can arrive late, and Verify's whole story depends on whether it is there.
      send(request.tabId, { type: "snapshot" });
      return { site, session: await openJob(site), status: statuses.get(request.tabId) ?? null };
    }

    case "job/list":
      return listJobs();

    case "job/delete":
      await deleteJob(request.site);
      return null;

    case "job/clear-all":
      await clearAllJobs();
      return null;

    case "job/reset": {
      const site = await siteOfTab(request.tabId);
      send(request.tabId, { type: "stop-recording" });
      generating.get(request.tabId)?.abort();
      await resetJob(site, { goal: request.goal });
      return view(request.tabId);
    }

    case "job/advance": {
      const site = await siteOfTab(request.tabId);
      return advance(site, request.to, { confirmed: request.confirmed }) ?? "home";
    }

    case "job/patch": {
      const site = await siteOfTab(request.tabId);
      patchJob(site, request.patch);
      return peekJob(site) ?? (await openJob(site));
    }

    case "page/start-recording": {
      const site = await siteOfTab(request.tabId);
      // A fresh job: new session id, new startedAt — every event's `t` is measured from it.
      const session = await resetJob(site, { goal: request.goal });
      const step = advance(site, "recording");
      send(request.tabId, { type: "start-recording", startedAt: session.startedAt });
      return step ?? "home";
    }

    case "page/stop-recording": {
      const site = await siteOfTab(request.tabId);
      send(request.tabId, { type: "stop-recording" });
      return advance(site, "review") ?? "recording";
    }

    case "page/snapshot":
      send(request.tabId, { type: "snapshot" });
      return statuses.get(request.tabId) ?? null;

    case "page/verify": {
      const site = await siteOfTab(request.tabId);
      const session = peekJob(site) ?? (await openJob(site));
      if (!session.generation) throw new Error("There is no generated tag to verify yet.");
      updateJob(site, (draft) => {
        draft.verify = { captured: draft.verify?.captured ?? [], errors: [] };
      });
      if (!send(request.tabId, { type: "verify", code: session.generation.code })) {
        throw new Error("The assistant is not attached to this page. Reload it and try again.");
      }
      return null;
    }

    case "page/inject-tag": {
      await siteOfTab(request.tabId);
      if (!send(request.tabId, { type: "inject-tag", url: request.url })) {
        throw new Error("The assistant is not attached to this page. Reload it and try again.");
      }
      await writeSettings({ lastInjectedTagUrl: request.url });
      return null;
    }

    case "page/clear-dedup": {
      const appId = statuses.get(request.tabId)?.appId ?? "";
      if (!appId) throw new Error("This page has no MediaJel tag, so there is no dedup state to clear.");
      send(request.tabId, { type: "clear-dedup", appId });
      return null;
    }

    case "service/generate": {
      const site = await siteOfTab(request.tabId);
      advance(site, "generating");
      void runGeneration(request.tabId, site, push);
      return null;
    }

    case "service/cancel-generate": {
      const site = await siteOfTab(request.tabId);
      generating.get(request.tabId)?.abort();
      generating.delete(request.tabId);
      advance(site, "review");
      return null;
    }

    case "service/existing-tag":
      return readExistingTag(currentIdToken, request.kind, request.name);

    case "service/deploy": {
      const site = await siteOfTab(request.tabId);
      const session = peekJob(site) ?? (await openJob(site));
      if (!session.generation) throw new Error("There is no generated tag to deploy.");

      const outcome = await deployTag(currentIdToken, {
        goal: session.goal,
        kind: request.kind,
        name: request.name,
        code: session.generation.code,
        expectedSha: request.expectedSha,
      });
      const base = (process.env.PLASMO_PUBLIC_FRICTIONLESS_CUSTOMTAG_URL ?? "").trim();
      updateJob(
        site,
        (draft) => {
          draft.deploy = {
            at: Date.now(),
            kind: request.kind,
            path: outcome.path,
            commitUrl: outcome.commitUrl,
            fileUrl: outcome.fileUrl,
            update: outcome.update,
            cdnUrl: base
              ? `${base}/${request.kind === "domain" ? "domains" : "app-ids"}/${btoa(request.name)}.js`
              : undefined,
          };
        },
        { flush: true },
      );
      advance(site, "done");
      return outcome;
    }
  }
};

/** Both deploy targets for a tab, so the panel can offer the choice without guessing paths. */
export const targetsFor = (site: string, appId: string): ReturnType<typeof deployTargets> => deployTargets(site, appId);
