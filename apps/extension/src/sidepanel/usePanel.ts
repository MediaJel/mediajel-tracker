import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { TagRecord } from "@mediajel/assistant-core/tags";
import { deployTargets } from "@mediajel/assistant-core/deploy/targets";
import { TrackerStatus } from "@mediajel/assistant-core/tags";
import { canDeploy, canGenerate } from "@mediajel/assistant-core/state/machine";
import { WidgetGoal, WidgetSession } from "@mediajel/assistant-core/types";

import type { AuthChallenge, Identity } from "~/auth/cognito";
import { AppFlowState, AppHandlers } from "~/ui/App";
import { JobPatch, JobView, Push, ask, onSignedOut } from "~/bridge/api";
import { PANEL_PORT } from "~/lib/ports";
import { apiUrl } from "~/service/client";
import { JobSummary } from "~/store/jobs";
import { DEFAULT_SETTINGS, Settings } from "~/store/settings";
import { TargetState } from "~/ui/screens/DeploySection";

import { TagActivityState, useTagActivity } from "./useTagActivity";

/**
 * Everything the panel knows and every move it can make.
 *
 * This is `widget.ts` rebuilt for a world where the state lives somewhere else. The old
 * version owned the session, the recorder and the network; this owns none of them — it asks
 * the background and re-renders when the background says something changed. What is left here
 * is genuinely view state: which slip is open, which deploy target is selected, whether the
 * start-over bar is showing.
 *
 * The one rule worth stating: nothing in the panel writes `session.step`. Every step change
 * goes through the background, which runs the machine, which is the only thing that can say no.
 */

export type Screen = "loading" | "sign-in" | "no-site" | "jobs" | "job";

/**
 * What the panel is doing right now, named.
 *
 * A boolean would be cheaper and useless: these actions take between 200ms and two minutes,
 * they are started from different places, and an operator watching a frozen button needs to
 * know which of them they are waiting for. `null` is the resting state.
 */
export type Pending =
  | "starting"
  | "stopping"
  | "generating"
  | "cancelling"
  | "verifying"
  | "checking-targets"
  | "deploying"
  | "resetting"
  | "loading-job";

export interface PanelState {
  screen: Screen;
  /** The action in flight, or null. Drives every in-progress affordance in the panel. */
  pending: Pending | null;
  /** A failure from the flow itself (stop, advance, verify, generate) — never a deploy. */
  flowError: string;
  identity: Identity | null;
  challenge: AuthChallenge | null;
  authBusy: boolean;
  authError: string;
  settings: Settings;
  site: string;
  session: WidgetSession | null;
  status: TrackerStatus;
  /** The last 7 days of every MediaJel tag on the page. */
  activity: TagActivityState;
  jobs: JobSummary[];
  flow: AppFlowState;
  generateBlocked: string;
  expanded: string[];
  confirmingReset: boolean;
  settingsOpen: boolean;
  access: { status: "idle" | "checking" | "ok" | "error"; message: string };
  tagUrl: string;
  handlers: AppHandlers;
  onToggleSlip(number: string): void;
  onOpenSettings(): void;
  onCloseSettings(): void;
  onOpenJob(site: string): void;
  onDeleteJob(site: string): void;
  onBackToJob(): void;
  signIn(username: string, password: string): void;
  answerChallenge(kind: AuthChallenge["kind"], answer: string): void;
}

const EMPTY_STATUS: TrackerStatus = {
  appId: "",
  environment: "",
  version: "",
  event: "",
  collector: "",
  tagPresent: false,
  tags: [],
  trackTransPresent: false,
  optedOut: false,
  warnings: [],
};

const DEFAULT_TAG_URL = (process.env.PLASMO_PUBLIC_TAG_URL ?? "").trim();

const message = (err: unknown): string => (err instanceof Error ? err.message : String(err));

export const usePanel = (): PanelState => {
  const [screen, setScreen] = useState<Screen>("loading");
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [challenge, setChallenge] = useState<AuthChallenge | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const [authError, setAuthError] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [site, setSite] = useState("");
  const [session, setSession] = useState<WidgetSession | null>(null);
  const [status, setStatus] = useState<TrackerStatus>(EMPTY_STATUS);
  /** Every MediaJel tag known on the bound tab's page, in the order first seen. */
  const [tags, setTags] = useState<TagRecord[]>([]);
  /** Whether the page has had its moment to load a tag — "no tag" means nothing before this. */
  const [settled, setSettled] = useState(false);
  const siteRef = useRef("");
  /** Why this service could not deploy even if the operator is signed in. Empty when it can. */
  const [deployUnavailable, setDeployUnavailable] = useState("");
  const [jobs, setJobs] = useState<JobSummary[]>([]);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [access, setAccess] = useState<PanelState["access"]>({ status: "idle", message: "" });

  const [verifyRunErrors, setVerifyRunErrors] = useState<string[]>([]);
  const [targetStates, setTargetStates] = useState<AppFlowState["deploy"]["targets"] | null>(null);
  const [selectedTarget, setSelectedTarget] = useState<"domain" | "app-id">("domain");
  const [deploying, setDeploying] = useState(false);
  const [deployError, setDeployError] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [flowError, setFlowError] = useState("");

  const tabIdRef = useRef<number | null>(null);

  const tabId = (): number => {
    const id = tabIdRef.current;
    if (id === null) throw new Error("The assistant is not bound to a tab yet.");
    return id;
  };

  /**
   * The session is over — found out by any request, or pushed by the background mid-generation. The
   * operator goes to sign in with the reason, instead of staying on a job whose every call now fails.
   */
  const signedOut = useCallback((reason: string) => {
    setIdentity(null);
    setChallenge(null);
    setSession(null);
    setFlowError("");
    setDeployError("");
    setAuthError(reason);
    setScreen("sign-in");
  }, []);

  useEffect(() => onSignedOut(signedOut), [signedOut]);

  const loadJob = useCallback(async (id: number) => {
    const view = (await ask({ type: "job/open", tabId: id })) as JobView | null;
    if (!view) {
      setScreen("no-site");
      return;
    }
    siteRef.current = view.site;
    setStatus(view.status);
    setTags(view.tags);
    setSettled(view.settled);
    setSite(view.site);
    setSession(view.session);
    setScreen("job");
  }, []);

  // Bind to the tab this panel was opened for, and re-bind when the operator switches tabs —
  // the panel is a view onto a page, and following the page is what makes it feel like part of
  // the browser rather than a window that happens to be open.
  useEffect(() => {
    let cancelled = false;

    // `sidepanel.html?tab=<id>` pins the panel to that tab — an extension page can only be opened
    // that way by the extension itself or a test driving it, and it is what lets an end-to-end run
    // look at the real panel bound to a real page.
    const pinned = Number(new URLSearchParams(window.location.search).get("tab"));

    const bind = async (): Promise<void> => {
      const tab = pinned
        ? await chrome.tabs.get(pinned)
        : (await chrome.tabs.query({ active: true, currentWindow: true }))[0];
      if (cancelled || !tab?.id) return;
      tabIdRef.current = tab.id;

      const [state, stored] = await Promise.all([ask({ type: "auth/session" }), ask({ type: "settings/read" })]);
      if (cancelled) return;
      setSettings(stored);
      setIdentity(state.identity);
      if (!state.identity) {
        setScreen("sign-in");
        return;
      }
      await loadJob(tab.id);
    };

    void bind();
    const onActivated = (): void => (pinned ? undefined : void bind());
    // Activation is not enough. Opening the client's site in a NEW tab activates it while it is
    // still the new-tab page, so the bind above resolves to no site and nothing re-runs once the
    // real URL arrives — the operator gets "this tab is not on a website yet" on a loaded page.
    // Re-bind when the tab this panel follows finishes navigating.
    const onUpdated = (tabId: number, change: chrome.tabs.OnUpdatedInfo, tab: chrome.tabs.Tab): void => {
      if (!change.url || (pinned ? tabId !== pinned : !tab.active)) return;
      void bind();
    };
    chrome.tabs.onActivated.addListener(onActivated);
    chrome.tabs.onUpdated.addListener(onUpdated);
    return () => {
      cancelled = true;
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
    };
  }, [loadJob]);

  // The background's push channel: recorded events, tracker status, verify results. Bound to
  // the tab so a second panel on another tab never sees this one's job.
  useEffect(() => {
    const id = tabIdRef.current;
    if (id === null || screen !== "job") return;

    let port: chrome.runtime.Port | null = null;
    let closed = false;

    const receive = (push: Push): void => {
      switch (push.type) {
        case "session":
          return setSession(push.session);
        case "verify-result":
          return setVerifyRunErrors(push.errors);
        case "generation-error":
          return setDeployError("");
        case "signed-out":
          return signedOut(push.message);
        case "tags":
          if (push.site !== siteRef.current) return undefined;
          setTags(push.tags);
          setSettled(push.settled);
          return setStatus(push.status);
        default:
          return undefined;
      }
    };

    // Chrome recycles the service worker after about thirty seconds of quiet, and this port dies
    // with it. Connecting once left the panel permanently deaf: the background would stop the
    // recording and advance the job, and the operator would go on watching a Stop button that
    // never changed, because the only channel carrying that news was gone. Reconnect, and re-read
    // the job — whatever was pushed while there was no port is not resent.
    const connect = (): void => {
      if (closed) return;
      try {
        port = chrome.runtime.connect({ name: `${PANEL_PORT}:${id}` });
      } catch {
        // The extension was reloaded or disabled out from under this panel. Reconnecting would
        // spin forever, so stop; the panel is re-created with the next tab bind.
        return;
      }
      port.onMessage.addListener(receive);
      port.onDisconnect.addListener(() => {
        port = null;
        if (closed) return;
        connect();
        void loadJob(id);
      });
    };

    connect();
    return () => {
      closed = true;
      port?.disconnect();
    };
  }, [screen, site, loadJob, signedOut]);

  /** The elapsed clock in the Record body. Ticks only while recording. */
  const [, setTick] = useState(0);
  useEffect(() => {
    if (session?.step !== "recording") return;
    const timer = setInterval(() => setTick((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, [session?.step]);

  /**
   * Every action the panel starts goes through here, so that starting one is visible and
   * failing one lands somewhere an operator will look.
   *
   * It used to do neither: no busy state at all, and every failure — a snapshot, a step change,
   * a verify — was written into `deployError`, which meant a failed Stop surfaced as a deploy
   * error three steps before there was anything to deploy.
   */
  const run = useCallback(async (name: Pending, work: () => Promise<unknown>): Promise<void> => {
    setPending(name);
    setFlowError("");
    try {
      await work();
    } catch (err) {
      setFlowError(message(err));
    } finally {
      setPending((current) => (current === name ? null : current));
    }
  }, []);

  const patch = useCallback((op: JobPatch) => void ask({ type: "job/patch", tabId: tabId(), patch: op }), []);

  /** Reads both candidate files from the repo so the choice shows new-vs-update honestly. */
  const checkTargets = useCallback(async (appId: string, hostname: string) => {
    const targets = deployTargets(hostname, appId);
    const initial: AppFlowState["deploy"]["targets"] = {
      domain: { info: targets.domain, existing: "checking" },
      appId: targets.appId ? { info: targets.appId, existing: "checking" } : null,
    };
    setTargetStates(initial);
    setDeployUnavailable("");

    const look = async (state: TargetState): Promise<TargetState> => {
      try {
        const file = await ask({ type: "service/existing-tag", kind: state.info.kind, name: state.info.name });
        return {
          ...state,
          existing: file.exists ? { preview: (file.content ?? "").slice(0, 400), sha: file.sha ?? "" } : "new",
        };
      } catch (err) {
        // One failure here is not like the others. "We could not read the repo" is a shrug;
        // "this service holds no deploy credential" means the Deploy step cannot work at all,
        // and swallowing it let an operator record, generate, verify and approve a tag before
        // a 500 at the commit told them. Keep the honest null either way, but say the second.
        const reason = message(err);
        if (/deploy credential/i.test(reason)) setDeployUnavailable(reason);
        return { ...state, existing: null };
      }
    };

    const domain = await look(initial.domain);
    const app = initial.appId ? await look(initial.appId) : null;
    setTargetStates({ domain, appId: app });
  }, []);

  const handlers: AppHandlers = useMemo(
    () => ({
      onStartRecording: (goal: WidgetGoal) =>
        void run("starting", () => ask({ type: "page/start-recording", tabId: tabId(), goal })),
      onStopRecording: () => void run("stopping", () => ask({ type: "page/stop-recording", tabId: tabId() })),
      onDiscard: () => void run("resetting", () => ask({ type: "job/reset", tabId: tabId() })),
      onToggleMark: (id) => patch({ op: "toggle-mark", id }),
      onNotes: (notes) => patch({ op: "notes", notes }),
      onBackToRecording: () =>
        void run("starting", async () => {
          await ask({ type: "job/advance", tabId: tabId(), to: "recording" });
          await ask({ type: "page/start-recording", tabId: tabId(), goal: session?.goal ?? "transaction" });
        }),
      onGenerate: () => void run("generating", () => ask({ type: "service/generate", tabId: tabId() })),
      onCancelGenerate: () => void run("cancelling", () => ask({ type: "service/cancel-generate", tabId: tabId() })),
      onRegenerate: () => void run("generating", () => ask({ type: "service/generate", tabId: tabId() })),
      onCodeEdit: (code) => patch({ op: "code", code }),
      onRechoose: () =>
        void run("resetting", async () => {
          await ask({ type: "job/advance", tabId: tabId(), to: "review" });
          patch({ op: "clear-marks" });
        }),
      onEvidenceMode: (mode) => patch({ op: "evidence-mode", mode }),
      onVerify: () =>
        void run("verifying", async () => {
          await ask({ type: "job/advance", tabId: tabId(), to: "verify" });
          setVerifyRunErrors([]);
          await ask({ type: "page/verify", tabId: tabId() });
        }),
      onVerifyRunAgain: () => void run("verifying", () => ask({ type: "page/verify", tabId: tabId() })),
      onBackToCode: () => void run("loading-job", () => ask({ type: "job/advance", tabId: tabId(), to: "result" })),
      onApproveVerify: () =>
        void run("checking-targets", async () => {
          await ask({ type: "job/advance", tabId: tabId(), to: "deploy" });
          const suggested = session?.generation?.suggestedTarget.kind;
          setSelectedTarget(suggested === "app-id" && status.appId ? "app-id" : "domain");
          await checkTargets(status.appId, site);
        }),
      onSelectTarget: (kind) => setSelectedTarget(kind),
      onDeploy: () =>
        void (async () => {
          const current =
            selectedTarget === "app-id" && targetStates?.appId ? targetStates.appId : targetStates?.domain;
          if (!current) return;
          setDeploying(true);
          setPending("deploying");
          setDeployError("");
          try {
            await ask({
              type: "service/deploy",
              tabId: tabId(),
              kind: current.info.kind,
              name: current.info.name,
              expectedSha: current.existing && typeof current.existing === "object" ? current.existing.sha : undefined,
            });
          } catch (err) {
            setDeployError(message(err));
          } finally {
            setDeploying(false);
            setPending((current) => (current === "deploying" ? null : current));
          }
        })(),
      onStartAnother: () =>
        void run("resetting", async () => {
          setTargetStates(null);
          setDeployError("");
          setVerifyRunErrors([]);
          setExpanded([]);
          await ask({ type: "job/reset", tabId: tabId() });
        }),
      onRequestReset: () => setConfirmingReset(true),
      onCancelReset: () => setConfirmingReset(false),
      onConfirmReset: () =>
        void run("resetting", async () => {
          setConfirmingReset(false);
          setTargetStates(null);
          setDeployError("");
          setVerifyRunErrors([]);
          setExpanded([]);
          await ask({ type: "job/reset", tabId: tabId(), goal: session?.goal });
        }),
      onCheckAccess: () =>
        void (async () => {
          setAccess({ status: "checking", message: "" });
          try {
            const line = await ask({ type: "auth/check-access" });
            setAccess({ status: "ok", message: `Access confirmed — ${line}.` });
          } catch (err) {
            setAccess({ status: "error", message: message(err) });
          }
        })(),
      onSettingsPatch: (next) =>
        void (async () => {
          setSettings(await ask({ type: "settings/write", patch: next }));
          if (access.status !== "idle") setAccess({ status: "idle", message: "" });
        })(),
      onSignOut: () =>
        void (async () => {
          await ask({ type: "auth/sign-out" });
          setIdentity(null);
          setSession(null);
          setScreen("sign-in");
        })(),
      onClearDedup: () => void run("loading-job", () => ask({ type: "page/clear-dedup", tabId: tabId() })),
      onInjectTag: (url) => void run("loading-job", () => ask({ type: "page/inject-tag", tabId: tabId(), url })),
      onClearAllJobs: () =>
        void (async () => {
          await ask({ type: "job/clear-all" });
          setJobs([]);
          await loadJob(tabId());
        })(),
      onOpenJobs: () =>
        void (async () => {
          setJobs(await ask({ type: "job/list" }));
          setSettingsOpen(false);
          setScreen("jobs");
        })(),
    }),
    [access.status, checkTargets, loadJob, patch, run, selectedTarget, session, site, status.appId, targetStates],
  );

  const generateBlocked = useMemo(() => {
    if (!apiUrl()) return "This build has no assistant service URL, so it cannot generate.";
    const ready = { signedIn: !!identity, acknowledgedDataSharing: settings.acknowledgedDataSharing };
    if (!ready.signedIn) return "Sign in with your MediaJel account.";
    if (!canGenerate(ready)) return "Tick the data-sharing acknowledgement in Settings.";
    return "";
  }, [identity, settings.acknowledgedDataSharing]);

  const fallbackTargets = useMemo(() => deployTargets(site, status.appId), [site, status.appId]);

  const activity = useTagActivity({ active: screen === "job", site, tags, settled });

  const flow: AppFlowState = {
    verifyRunErrors,
    deploy: {
      targets: targetStates ?? {
        domain: { info: fallbackTargets.domain, existing: null },
        appId: fallbackTargets.appId ? { info: fallbackTargets.appId, existing: null } : null,
      },
      selected: selectedTarget,
      deploying,
      deployError,
      deployBlocked: canDeploy({ signedIn: !!identity, acknowledgedDataSharing: settings.acknowledgedDataSharing })
        ? deployUnavailable
        : "Sign in with your MediaJel account",
      cdnState: session?.deploy?.cdnUrl ? "waiting" : "idle",
    },
  };

  return {
    screen,
    pending,
    flowError,
    identity,
    challenge,
    authBusy,
    authError,
    settings,
    site,
    session,
    status,
    // The report and Settings take the same place in the panel, so opening one closes the other.
    activity: {
      ...activity,
      openReport: () => {
        setSettingsOpen(false);
        activity.openReport();
      },
    },
    jobs,
    flow,
    generateBlocked,
    expanded,
    confirmingReset,
    settingsOpen,
    access,
    tagUrl: settings.lastInjectedTagUrl || DEFAULT_TAG_URL,
    handlers,
    onToggleSlip: (number) =>
      setExpanded((current) =>
        current.includes(number) ? current.filter((entry) => entry !== number) : [...current, number],
      ),
    onOpenSettings: () => {
      activity.closeReport();
      setSettingsOpen(true);
    },
    onCloseSettings: () => setSettingsOpen(false),
    onOpenJob: (next) =>
      void (async () => {
        setScreen("loading");
        // Opening a job from the list means opening the site it belongs to: the recorder and
        // Verify both need that page in front of us, so the tab goes there and the panel follows.
        await chrome.tabs.update(tabId(), { url: `https://${next}/` });
        await loadJob(tabId());
      })(),
    onDeleteJob: (next) =>
      void (async () => {
        await ask({ type: "job/delete", site: next });
        setJobs(await ask({ type: "job/list" }));
      })(),
    onBackToJob: () => void loadJob(tabId()),

    signIn: (username, password) =>
      void (async () => {
        setAuthBusy(true);
        setAuthError("");
        try {
          const state = await ask({ type: "auth/sign-in", username, password });
          setChallenge(state.challenge);
          setIdentity(state.identity);
          if (state.identity) await loadJob(tabId());
        } catch (err) {
          setAuthError(message(err));
        } finally {
          setAuthBusy(false);
        }
      })(),

    answerChallenge: (kind, answer) =>
      void (async () => {
        setAuthBusy(true);
        setAuthError("");
        try {
          const state = await ask({ type: "auth/answer", kind, answer });
          setChallenge(state.challenge);
          setIdentity(state.identity);
          if (state.identity) await loadJob(tabId());
        } catch (err) {
          setAuthError(message(err));
        } finally {
          setAuthBusy(false);
        }
      })(),
  };
};
