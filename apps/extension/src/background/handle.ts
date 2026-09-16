import { deployTargets } from "@mediajel/assistant-core/deploy/targets";
import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";

import { AuthState, JobPatch, JobView, Request, ResultOf } from "~/bridge/api";
import { BridgeDown } from "~/bridge/protocol";
import { answerChallenge, forgetPending, signIn } from "~/auth/cognito";
import { siteOf } from "~/lib/site";
import { heardTags } from "~/background/beacons";
import { readTagsOnPage } from "~/background/page-tags";
import { checkAccess, deployTag, generateTag, readExistingTag, readTagActivity } from "~/service/client";
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
const statuses = new Map<number, { site: string; status: TrackerStatus }>();
export const rememberStatus = (tabId: number, site: string, status: TrackerStatus): void => {
  statuses.set(tabId, { site, status });
};

/**
 * A status describes the page that sent it. Once the tab has moved to another site it describes
 * somebody else's tags — and handing it back used to show that site's app IDs on this one until
 * the new page reported.
 */
const statusOf = (tabId: number, site?: string): TrackerStatus | null => {
  const entry = statuses.get(tabId);
  return entry && (site === undefined || entry.site === site) ? entry.status : null;
};

/** In-flight generations, so Cancel has something to abort and a stale answer cannot land. */
const generating = new Map<number, AbortController>();

/** Delivers a command to a tab's page; resolves false when nothing in the page could receive it. */
type Send = (tabId: number, message: BridgeDown) => Promise<boolean>;
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
      status: statusOf(tabId, site) ?? emptyStatus(),
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
  tags: [],
  trackTransPresent: false,
  optedOut: false,
  warnings: ["The assistant has not read this page's tag yet."],
});

const view = async (tabId: number): Promise<JobView> => {
  const site = await siteOfTab(tabId);
  const [session, heard, found] = await Promise.all([openJob(site), heardTags(tabId, site), readTagsOnPage(tabId)]);
  return { site, session, status: statusOf(tabId, site), heard, found };
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
      if (!siteOf(tab.url ?? "")) return null;
      // Ask the page what it can see now rather than trusting a snapshot from a page-load ago;
      // a tag can arrive late, and Verify's whole story depends on whether it is there.
      void send(request.tabId, { type: "snapshot" });
      return view(request.tabId);
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
      void send(request.tabId, { type: "stop-recording" });
      generating.get(request.tabId)?.abort();
      await resetJob(site, { goal: request.goal });
      return view(request.tabId);
    }

    case "job/advance": {
      const site = await siteOfTab(request.tabId);
      // Same reason as stop: without this, a recycled worker turns every step change into "home".
      await openJob(site);
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
      void send(request.tabId, { type: "start-recording", startedAt: session.startedAt });
      return step ?? "home";
    }

    case "page/stop-recording": {
      const site = await siteOfTab(request.tabId);
      // Rehydrate first. A recording is minutes of the panel saying nothing to this worker, so
      // Chrome has very likely recycled it and `live` is empty — and `advance` on an empty map
      // returns null, which used to leave the operator pressing Stop against a dead step.
      await openJob(site);
      void send(request.tabId, { type: "stop-recording" });
      return advance(site, "review") ?? "recording";
    }

    case "page/snapshot":
      void send(request.tabId, { type: "snapshot" });
      return statusOf(request.tabId);

    case "page/verify": {
      const site = await siteOfTab(request.tabId);
      const session = peekJob(site) ?? (await openJob(site));
      if (!session.generation) throw new Error("There is no generated tag to verify yet.");
      updateJob(site, (draft) => {
        draft.verify = { captured: draft.verify?.captured ?? [], errors: [] };
      });
      if (!(await send(request.tabId, { type: "verify", code: session.generation.code }))) {
        throw new Error("The assistant is not attached to this page. Reload it and try again.");
      }
      return null;
    }

    case "page/inject-tag": {
      await siteOfTab(request.tabId);
      if (!(await send(request.tabId, { type: "inject-tag", url: request.url }))) {
        throw new Error("The assistant is not attached to this page. Reload it and try again.");
      }
      await writeSettings({ lastInjectedTagUrl: request.url });
      return null;
    }

    case "page/clear-dedup": {
      const appId = statusOf(request.tabId)?.appId ?? "";
      if (!appId) throw new Error("This page has no MediaJel tag, so there is no dedup state to clear.");
      void send(request.tabId, { type: "clear-dedup", appId });
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

    case "service/tag-activity":
      return readTagActivity(currentIdToken, request.appIds);

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

    default:
      // A panel newer than this background asked for something it has no case for. Answering with
      // nothing surfaced as a crash layers away in the panel; refusing in words says what to do.
      throw new Error(
        `This version of the assistant's background does not know "${(request as { type: string }).type}". Reload the extension in chrome://extensions.`,
      );
  }
};

/** Both deploy targets for a tab, so the panel can offer the choice without guessing paths. */
export const targetsFor = (site: string, appId: string): ReturnType<typeof deployTargets> => deployTargets(site, appId);
