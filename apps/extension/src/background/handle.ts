import { deployTargets } from "@mediajel/assistant-core/deploy/targets";
import { TagRecord, TrackerStatus } from "@mediajel/assistant-core/tags";
import { trackerStatus } from "@mediajel/assistant-core/tags";
import { viewOf } from "@mediajel/assistant-core/wire/view";

import { AuthState, JobPatch, JobView, Request, ResultOf } from "~/bridge/api";
import { BridgeDown } from "~/bridge/protocol";
import { answerChallenge, forgetPending, signIn } from "~/auth/cognito";
import { SIGNED_OUT } from "~/auth/signed-out";
import { siteOf } from "~/lib/site";
import { failureAnswer } from "~/background/answer";
import { attach } from "~/background/attach";
import { clearLedger, readLedger } from "~/background/ledger";
import { learn, tagsOfTab } from "~/background/tag-state";
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

/** What the Record step and the prompt read about a tab's page, from everything learned about it. */
const statusOf = async (tabId: number, site: string): Promise<TrackerStatus> =>
  trackerStatus(await tagsOfTab(tabId, site));

const slimTag = ({
  appId,
  state,
  environment,
  version,
  event,
  announced,
  error,
  firstSeenAt,
}: TagRecord): TagRecord => ({
  appId,
  state,
  environment,
  version,
  event,
  announced,
  ...(error === undefined ? {} : { error }),
  firstSeenAt,
  collector: "",
  enabled: true,
  config: null,
});

/**
 * The status as it stood before the tag record learned its collector, its configuration and when it
 * was last heard — what the assistant service has always been sent. Nothing the panel now reads off
 * the wire leaves the browser with a generation.
 */
const slimStatus = (status: TrackerStatus): TrackerStatus => ({
  ...status,
  collector: "",
  tags: status.tags.map(slimTag),
});

/** In-flight generations, so Cancel has something to abort and a stale answer cannot land. */
const generating = new Map<number, AbortController>();

/** Delivers a command to a tab's page; resolves false when nothing in the page could receive it. */
type Send = (tabId: number, message: BridgeDown) => Promise<boolean>;
type Push = (tabId: number, message: unknown) => void;

/**
 * Delivers a command, attaching to the page first when nothing there could receive it — a tab
 * open before this build of the extension was. Only a page Chrome keeps extensions out of stays
 * unreachable.
 */
const deliver = async (send: Send, tabId: number, message: BridgeDown): Promise<boolean> =>
  (await send(tabId, message)) || ((await attach(tabId)) && send(tabId, message));

const UNREACHABLE = "The assistant could not attach to this page; Chrome does not allow extensions on it.";

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
      status: slimStatus(await statusOf(tabId, site)),
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
    if (generating.get(tabId) === controller) await failGeneration(tabId, site, err, push);
  } finally {
    if (generating.get(tabId) === controller) generating.delete(tabId);
  }
};

/**
 * A failed run goes back to Evidence with its reason. When the session ended mid-run, the panel is
 * sent to sign in as well — the reason stays on the job for when the operator is back.
 */
const failGeneration = async (tabId: number, site: string, err: unknown, push: Push): Promise<void> => {
  const answer = await failureAnswer(err);
  if (answer.error === "Cancelled.") return; // the cancel handler already moved the step
  updateJob(site, (draft) => {
    draft.generationError = answer.error;
  });
  advance(site, "review");
  const message = answer.error;
  push(tabId, answer.code === SIGNED_OUT ? { type: "signed-out", message } : { type: "generation-error", message });
};

const view = async (tabId: number): Promise<JobView> => {
  const site = await siteOfTab(tabId);
  const [session, tab] = await Promise.all([openJob(site), tagsOfTab(tabId, site)]);
  return { site, session, status: trackerStatus(tab), tags: tab.tags, settled: tab.settled };
};

/** Reads the page's scripts now, records what they name, and tells the panel when that is news. */
const publishScripts = async (tabId: number, site: string, push: Push): Promise<void> => {
  const found = await readTagsOnPage(tabId);
  const tab = found && (await learn(tabId, site, { kind: "scripts", tags: found }));
  if (tab) push(tabId, { type: "tags", site, tags: tab.tags, settled: tab.settled, status: trackerStatus(tab) });
};

/** An injected tag is in the page's scripts a moment later; read them then, so its row fills in. */
const INJECTED_SCRIPT_READ_MS = 1_500;

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
      // Ask the page what it can see now rather than trusting what it said a page-load ago — a
      // tag can arrive late, and Verify's whole story depends on whether it is there — and read
      // its scripts from here, which needs nothing in the page to answer.
      void deliver(send, request.tabId, { type: "snapshot" });
      await publishScripts(request.tabId, site, push);
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
      void deliver(send, request.tabId, { type: "start-recording", startedAt: session.startedAt });
      return step ?? "home";
    }

    case "page/stop-recording": {
      const site = await siteOfTab(request.tabId);
      // Rehydrate first. A recording is minutes of the panel saying nothing to this worker, so
      // Chrome has very likely recycled it and `live` is empty — and `advance` on an empty map
      // returns null, which used to leave the operator pressing Stop against a dead step.
      await openJob(site);
      void deliver(send, request.tabId, { type: "stop-recording" });
      return advance(site, "review") ?? "recording";
    }

    case "page/verify": {
      const site = await siteOfTab(request.tabId);
      const session = peekJob(site) ?? (await openJob(site));
      if (!session.generation) throw new Error("There is no generated tag to verify yet.");
      updateJob(site, (draft) => {
        draft.verify = { captured: draft.verify?.captured ?? [], errors: [] };
      });
      if (!(await deliver(send, request.tabId, { type: "verify", code: session.generation.code })))
        throw new Error(UNREACHABLE);
      return null;
    }

    case "page/inject-tag": {
      const site = await siteOfTab(request.tabId);
      if (!(await deliver(send, request.tabId, { type: "inject-tag", url: request.url }))) throw new Error(UNREACHABLE);
      setTimeout(() => void publishScripts(request.tabId, site, push), INJECTED_SCRIPT_READ_MS);
      await writeSettings({ lastInjectedTagUrl: request.url });
      return null;
    }

    case "page/clear-dedup": {
      const site = await siteOfTab(request.tabId);
      const { appId } = await statusOf(request.tabId, site);
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

    case "events/read":
      return viewOf(await readLedger(request.tabId, await siteOfTab(request.tabId)));

    case "events/clear":
      await clearLedger(request.tabId, await siteOfTab(request.tabId));
      return null;

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
