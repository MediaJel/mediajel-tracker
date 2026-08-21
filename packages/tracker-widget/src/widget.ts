import { QueryStringContext } from "@mediajel/tracker-core/types";
import { guard } from "@mediajel/tracker-core/utils/guard";
import { TrackerWidget, TrackerWidgetDisableOptions, TrackerWidgetPrefill } from "@mediajel/tracker-widget/api";
import { WidgetContext } from "@mediajel/tracker-widget/context";
import logger from "@mediajel/tracker-widget/log";
import { snapshotTracker } from "@mediajel/tracker-widget/recorder/context";
import { Recorder, createRecorder } from "@mediajel/tracker-widget/recorder/recorder";
import { captureRuntime } from "@mediajel/tracker-widget/runtime";
import { generateTag } from "@mediajel/tracker-widget/ai/generate";
import { cdnUrl, pollCdn, CdnPoller } from "@mediajel/tracker-widget/deploy/cdn";
import { deployTag, deployTargets } from "@mediajel/tracker-widget/deploy/deploy";
import { GitHubClient, createGitHubClient } from "@mediajel/tracker-widget/deploy/github";
import { canDeploy, canGenerate } from "@mediajel/tracker-widget/state/machine";
import { AppFlowState } from "@mediajel/tracker-widget/ui/App";
import { TargetState } from "@mediajel/tracker-widget/ui/screens/DeploySection";
import { runGenerated } from "@mediajel/tracker-widget/verify/runner";
import { WIDGET_ACTIVE_KEY, WIDGET_SESSION_KEY } from "@mediajel/tracker-widget/session/keys";
import { WidgetSettingsPatch, createSettingsStore } from "@mediajel/tracker-widget/session/settings";
import { createSessionStore } from "@mediajel/tracker-widget/session/store";
import App from "@mediajel/tracker-widget/ui/App";
import { createHost } from "@mediajel/tracker-widget/ui/host";
// Every third-party import goes through the pre-bundled vendor module — see the "//vendor"
// note in package.json for why Parcel cannot consume these packages from node_modules.
import { h, render } from "@mediajel/tracker-widget/vendor";

/**
 * The lazy entry point. Everything third-party the widget needs is reachable only from this
 * module, so Parcel emits it as a single `widget.<hash>.js` chunk that the tag downloads on
 * demand and a visitor who never enables the widget never pays for.
 *
 * The one thing that happens at import time is the runtime capture below. Everything else —
 * the host, the stores, the render — waits for `enable()` or `resume()`, because the chunk can
 * be fetched before the operator has agreed to anything.
 */

/**
 * The browser's own `fetch` and XHR, taken at chunk load: as early as code that loads on demand
 * can possibly run, and — critically — before the recorder wraps either of them. Reading two
 * properties is not a side effect; it is the whole point of doing it here.
 */
const runtime = captureRuntime();

/** Re-exported so the E2E harness and apps/tracker can find the host without a string literal. */
export { WIDGET_HOST_ID } from "@mediajel/tracker-widget/ui/host";

const clearSession = (): void => {
  try {
    sessionStorage.removeItem(WIDGET_SESSION_KEY);
  } catch (err) {
    logger.warn("Could not clear the recorded session:", err);
  }
};

const setActive = (active: boolean): void => {
  try {
    if (active) sessionStorage.setItem(WIDGET_ACTIVE_KEY, "1");
    else sessionStorage.removeItem(WIDGET_ACTIVE_KEY);
  } catch (err) {
    // Sandboxed iframes and blocked storage. The widget still works for this page view; it
    // just will not come back by itself after a navigation.
    logger.warn("Could not record that the assistant is running in this tab:", err);
  }
};

/**
 * Builds the widget for this page.
 *
 * @param tag the tag's parsed query string. It is handed over rather than read here because it
 *            comes from `document.currentScript`, which is only readable while the tag's own
 *            script element is executing — long before this chunk loads.
 */
/** Which section owns a step — mirrors SECTIONS in ui/App.tsx. */
const activeSectionFor = (step: string): string => {
  if (step === "home" || step === "recording") return "01";
  if (step === "review") return "02";
  if (step === "generating" || step === "result") return "03";
  if (step === "verify") return "04";
  return "05";
};

export const createWidget = (tag: QueryStringContext): TrackerWidget => {
  let ctx: WidgetContext | null = null;
  let recorder: Recorder | null = null;
  let unsubscribe: (() => void) | null = null;
  let unsubscribeSettings: (() => void) | null = null;
  let ticker: ReturnType<typeof setInterval> | null = null;
  let open = false;
  let settingsOpen = false;
  let generationAbort: AbortController | null = null;
  // Strict-accordion override; cleared whenever the step moves so the new section opens.
  let toggled: { number: string; open: boolean } | null = null;
  let lastStep: string | null = null;
  let confirmingReset = false;

  // Verify/deploy view state — per page, not persisted (the session carries the durable half).
  let verifyRunErrors: string[] = [];
  let lastInjectedCode: string | null = null;
  let targetStates: { domain: TargetState; appId: TargetState | null } | null = null;
  let selectedTarget: "domain" | "app-id" = "domain";
  let deploying = false;
  let deployError = "";
  let cdnState: "idle" | "waiting" | "live" | "gave-up" = "idle";
  let cdnPoller: CdnPoller | null = null;

  /**
   * House rule: anything the browser calls back into is wrapped, so a throw inside the widget
   * can never surface as an error on the client's page. Built once rather than per render —
   * a fresh identity every draw would make preact rebind the listener each time.
   */
  const onToggleOpen = guard((): void => {
    open = !open;
    draw();
  }, "widget-toggle");

  const handlers = {
    onStartRecording: guard((goal: "transaction" | "signup"): void => {
      if (!ctx || !recorder) return;
      // A fresh job: new session id, new startedAt (every `t` is measured from it).
      ctx.session.reset({ goal });
      ctx.session.transition("recording");
      recorder.start();
    }, "widget-start-recording"),

    onStopRecording: guard((): void => {
      if (!ctx || !recorder) return;
      recorder.stop();
      ctx.session.transition("review");
    }, "widget-stop-recording"),

    /** The Discard button IS the confirmation — one explicit click, clearly labeled. */
    onDiscard: guard((): void => {
      if (!ctx || !recorder) return;
      recorder.stop();
      ctx.session.reset();
    }, "widget-discard"),

    onToggleMark: guard((id: string): void => {
      ctx?.session.update((draft) => {
        const index = draft.markedIds.indexOf(id);
        if (index === -1) draft.markedIds.push(id);
        else draft.markedIds.splice(index, 1);
      });
    }, "widget-toggle-mark"),

    onNotes: guard((notes: string): void => {
      ctx?.session.update((draft) => {
        draft.notes = notes;
      });
    }, "widget-notes"),

    onBackToRecording: guard((): void => {
      if (!ctx || !recorder) return;
      if (ctx.session.transition("recording") === "recording") recorder.start();
    }, "widget-back-to-recording"),

    /**
     * Generate is gated twice: evidence must be pinned (Evidence's job) and the settings must
     * be complete (Settings' job). An incomplete configuration OPENS settings rather than
     * failing — the button always moves the operator toward done.
     */
    onGenerate: guard((): void => {
      if (!ctx) return;
      if (ctx.session.get().markedIds.length === 0) return; // the blocked note says why
      if (!canGenerate(ctx.settings.get())) {
        settingsOpen = true;
        draw();
        return;
      }
      ctx.session.transition("generating");
      void runGeneration();
    }, "widget-generate"),

    onCancelGenerate: guard((): void => {
      generationAbort?.abort();
      ctx?.session.transition("review");
    }, "widget-cancel-generate"),

    onRegenerate: guard((): void => {
      if (!ctx) return;
      if (ctx.session.transition("generating") === "generating") void runGeneration();
    }, "widget-regenerate"),

    onCodeEdit: guard((code: string): void => {
      ctx?.session.update((draft) => {
        if (!draft.generation) return;
        draft.generation = { ...draft.generation, code, edited: true };
      });
    }, "widget-code-edit"),

    onVerify: guard((): void => {
      if (!ctx) return;
      if (ctx.session.transition("verify") === "verify") startVerify();
    }, "widget-verify"),

    onVerifyRunAgain: guard((): void => {
      startVerify();
    }, "widget-verify-again"),

    onBackToCode: guard((): void => {
      ctx?.session.transition("result");
    }, "widget-back-to-code"),

    onApproveVerify: guard((): void => {
      if (!ctx) return;
      if (ctx.session.transition("deploy") !== "deploy") return;
      selectedTarget =
        ctx.session.get().generation?.suggestedTarget.kind === "app-id" && ctx.tag.appId ? "app-id" : "domain";
      void checkTargets();
    }, "widget-approve-verify"),

    onSelectTarget: guard((kind: "domain" | "app-id"): void => {
      selectedTarget = kind;
      draw();
    }, "widget-select-target"),

    onDeploy: guard((): void => {
      void runDeploy();
    }, "widget-deploy"),

    onStartAnother: guard((): void => {
      if (!ctx) return;
      cdnPoller?.stop();
      cdnPoller = null;
      cdnState = "idle";
      targetStates = null;
      deployError = "";
      verifyRunErrors = [];
      ctx.session.reset();
    }, "widget-start-another"),

    onExit: guard((): void => {
      cdnPoller?.stop();
      cdnPoller = null;
      void disable();
    }, "widget-exit"),

    onRequestReset: guard((): void => {
      confirmingReset = true;
      draw();
    }, "widget-request-reset"),

    onCancelReset: guard((): void => {
      confirmingReset = false;
      draw();
    }, "widget-cancel-reset"),

    /** The confirmed reset: everything about this job goes; settings and the page stay. */
    onConfirmReset: guard((): void => {
      if (!ctx) return;
      confirmingReset = false;
      generationAbort?.abort();
      recorder?.stop();
      cdnPoller?.stop();
      cdnPoller = null;
      cdnState = "idle";
      targetStates = null;
      deployError = "";
      deploying = false;
      verifyRunErrors = [];
      toggled = null;
      const goal = ctx.session.get().goal;
      ctx.session.reset({ goal });
      open = true;
      draw();
    }, "widget-confirm-reset"),

    onSettingsPatch: guard((patch: Parameters<WidgetContext["settings"]["update"]>[0]): void => {
      ctx?.settings.update(patch);
    }, "widget-settings-patch"),

    onForget: guard((): void => {
      ctx?.settings.forget();
    }, "widget-forget"),

    /** The tag's dedup silently swallows repeated test fires; clearing it is a test-run reset. */
    onClearDedup: guard((): void => {
      const appId = ctx?.tag.appId;
      if (!appId) return;
      try {
        const doomed: string[] = [];
        for (let i = 0; i < localStorage.length; i += 1) {
          const key = localStorage.key(i);
          if (key?.startsWith(`${appId}_`)) doomed.push(key);
        }
        for (const key of doomed) localStorage.removeItem(key);
        logger.debug(`Cleared ${doomed.length} tracker dedup entr${doomed.length === 1 ? "y" : "ies"}.`);
      } catch (err) {
        logger.warn("Could not clear the tracker dedup state:", err);
      }
    }, "widget-clear-dedup"),
  };

  /**
   * The one async workflow the widget owns. The step is already `generating` when this runs;
   * success installs the structured result and moves to `result`; failure returns the work
   * order to Evidence with a message the operator can act on. A cancel aborts the request
   * and the stale response — checked by run id — can never overwrite a newer state.
   */
  let generationRun = 0;
  const runGeneration = async (): Promise<void> => {
    if (!ctx) return;
    const run = (generationRun += 1);
    generationAbort?.abort();
    generationAbort = new AbortController();

    try {
      const { output, model, violations } = await generateTag({
        session: ctx.session.get(),
        status: snapshotTracker(ctx),
        settings: ctx.settings.get(),
        runtime: ctx.runtime,
        signal: generationAbort.signal,
      });
      if (!ctx || run !== generationRun) return; // cancelled or superseded
      ctx.session.update((draft) => {
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
      });
      ctx.session.transition("result");
    } catch (err) {
      if (!ctx || run !== generationRun) return;
      const message = err instanceof Error ? err.message : String(err);
      if (message === "Cancelled.") return; // the cancel handler already moved the step
      ctx.session.update((draft) => {
        draft.generationError = message;
      });
      ctx.session.transition("review");
    }
  };

  /**
   * Injects the generated code on this page with the interceptor live. Re-injecting the SAME
   * text is skipped (its listeners are already attached); edited code layers a new version on
   * top — the fine print warns that the old one keeps listening until a reload.
   */
  const startVerify = (): void => {
    if (!ctx) return;
    const generation = ctx.session.get().generation;
    if (!generation) return;

    ctx.session.update((draft) => {
      draft.verify = { captured: draft.verify?.captured ?? [], errors: [] };
    });

    if (lastInjectedCode === generation.code) {
      verifyRunErrors = [];
      draw();
      return;
    }

    const result = runGenerated(generation.code, (capture) => {
      if (!ctx) return;
      ctx.session.update((draft) => {
        const verify = draft.verify ?? { captured: [], errors: [] };
        draft.verify = { ...verify, captured: [...verify.captured, capture] };
      });
      ctx.session.flush();
    });
    verifyRunErrors = result.errors;
    if (result.ok) lastInjectedCode = generation.code;
    draw();
  };

  const githubClient = (): GitHubClient | null => {
    if (!ctx) return null;
    const token = ctx.settings.get().githubToken.trim();
    return token ? createGitHubClient(token, ctx.runtime) : null;
  };

  /** Reads both candidate files from the repo so the choice shows new-vs-update honestly. */
  const checkTargets = async (): Promise<void> => {
    if (!ctx) return;
    const targets = deployTargets(String(ctx.tag.appId ?? ""));
    targetStates = {
      domain: { info: targets.domain, existing: null },
      appId: targets.appId ? { info: targets.appId, existing: null } : null,
    };
    const client = githubClient();
    if (!client) {
      draw();
      return;
    }
    const check = async (state: TargetState): Promise<void> => {
      state.existing = "checking";
      draw();
      try {
        const file = await client.getFile(state.info.path);
        state.existing = file ? { preview: file.content.slice(0, 400), sha: file.sha } : "new";
      } catch (err) {
        logger.warn("Could not check the repo for an existing tag:", err);
        state.existing = null;
      }
      draw();
    };
    await check(targetStates.domain);
    if (targetStates.appId) await check(targetStates.appId);
  };

  const runDeploy = async (): Promise<void> => {
    if (!ctx || deploying || !targetStates) return;
    const generation = ctx.session.get().generation;
    if (!generation) return;
    const client = githubClient();
    if (!client) {
      settingsOpen = true;
      draw();
      return;
    }

    const state = selectedTarget === "app-id" && targetStates.appId ? targetStates.appId : targetStates.domain;
    deploying = true;
    deployError = "";
    draw();
    try {
      const outcome = await deployTag({
        client,
        target: state.info,
        code: generation.code,
        goal: ctx.session.get().goal,
        actor: ctx.settings.get().actor,
        existingSha: state.existing !== null && typeof state.existing === "object" ? state.existing.sha : undefined,
      });
      const cdn = cdnUrl(state.info.kind, state.info.name);
      ctx.session.update((draft) => {
        draft.deploy = {
          at: Date.now(),
          kind: state.info.kind,
          path: outcome.path,
          commitUrl: outcome.commitUrl,
          fileUrl: outcome.fileUrl,
          update: outcome.update,
          cdnUrl: cdn ?? undefined,
        };
      });
      ctx.session.transition("done");
      if (cdn) {
        cdnState = "waiting";
        cdnPoller = pollCdn(cdn, ctx.runtime, (next) => {
          cdnState = next;
          draw();
        });
      }
    } catch (err) {
      deployError = err instanceof Error ? err.message : String(err);
    } finally {
      deploying = false;
      draw();
    }
  };

  const deployBlocked = (): string => {
    if (!ctx) return "";
    return canDeploy(ctx.settings.get()) ? "" : "Add a GitHub token and your name/email";
  };

  const flowState = (): AppFlowState => {
    const fallbackTargets = deployTargets(String(ctx?.tag.appId ?? ""));
    return {
      verifyRunErrors,
      deploy: {
        targets: targetStates ?? {
          domain: { info: fallbackTargets.domain, existing: null },
          appId: fallbackTargets.appId ? { info: fallbackTargets.appId, existing: null } : null,
        },
        selected: selectedTarget,
        deploying,
        deployError,
        deployBlocked: deployBlocked(),
        cdnState,
      },
    };
  };

  const generateBlocked = (): string => {
    if (!ctx) return "";
    if (ctx.session.get().markedIds.length === 0) return "Pin at least one event as evidence first.";
    const settings = ctx.settings.get();
    if (!settings.apiKey.trim()) return "Add a provider API key — Generate opens Settings for you.";
    if (!settings.acknowledgedDataSharing) return "Tick the data-sharing acknowledgement in Settings.";
    return "";
  };

  const onToggleSection = guard((number: string): void => {
    if (!ctx) return;
    const step = ctx.session.get().step;
    const active = number === activeSectionFor(step);
    const currentlyOpen = toggled ? toggled.number === number && toggled.open : active;
    toggled = { number, open: !currentlyOpen };
    draw();
  }, "widget-toggle-section");

  const onOpenSettings = guard((): void => {
    settingsOpen = true;
    draw();
  }, "widget-open-settings");

  const onCloseSettings = guard((): void => {
    settingsOpen = false;
    draw();
  }, "widget-close-settings");

  const draw = (): void => {
    if (!ctx) return;
    const step = ctx.session.get().step;
    if (step !== lastStep) {
      lastStep = step;
      toggled = null;
    }
    render(
      h(App, {
        context: ctx.tag,
        session: ctx.session.get(),
        settings: ctx.settings.get(),
        status: snapshotTracker(ctx),
        handlers,
        flow: flowState(),
        generateBlocked: generateBlocked(),
        open,
        onToggleOpen,
        toggled,
        onToggleSection,
        confirmingReset,
        settingsOpen,
        onOpenSettings,
        onCloseSettings,
      }),
      ctx.host.mount,
    );
  };

  const mount = (): WidgetContext => {
    if (ctx) return ctx;

    const host = createHost();
    const session = createSessionStore();
    const settings = createSettingsStore();

    ctx = { tag, runtime, host, session, settings, isOwn: host.isOwn };
    recorder = createRecorder(ctx);
    // One re-render per change, from one place. The screens will move to hooks; the shell has
    // no local state worth the machinery.
    unsubscribe = session.subscribe(draw);
    unsubscribeSettings = settings.subscribe(draw);
    // The elapsed clock in the Record body. Redraws only while recording; cleared on disable.
    ticker = setInterval(
      guard(() => {
        if (ctx?.session.get().step === "recording") draw();
      }, "widget-ticker"),
      1_000,
    );
    return ctx;
  };

  /** `open` is not a setting, and an absent key must never overwrite a stored value. */
  const applyPrefill = (prefill: TrackerWidgetPrefill, context: WidgetContext): void => {
    const patch: WidgetSettingsPatch = {};
    if (prefill.provider !== undefined) patch.provider = prefill.provider;
    if (prefill.model !== undefined) patch.model = prefill.model;
    if (prefill.apiKey !== undefined) patch.apiKey = prefill.apiKey;
    if (prefill.githubToken !== undefined) patch.githubToken = prefill.githubToken;
    if (prefill.actor !== undefined) patch.actor = prefill.actor;
    if (prefill.remember !== undefined) patch.remember = prefill.remember;

    if (Object.keys(patch).length > 0) context.settings.update(patch);
  };

  const enable = async (prefill?: TrackerWidgetPrefill): Promise<void> => {
    const context = mount();
    if (prefill) applyPrefill(prefill, context);

    // Marks this tab as running the widget so the stub re-imports the chunk after a
    // navigation. Set on enable, cleared on disable — never on mere chunk load.
    setActive(true);

    // An explicit enable is a request to work, so the card opens; `open: false` mounts it as
    // the chip instead.
    open = prefill?.open ?? true;
    draw();

    logger.debug("Assistant enabled", { appId: context.tag.appId, step: context.session.get().step });
  };

  const resume = async (): Promise<void> => {
    const context = mount();

    // A recording that spanned a navigation re-arms itself: new page entry, sources back on.
    if (context.session.get().step === "recording") recorder?.start();
    // A verify in flight re-injects on every page, the way the deployed tag will run.
    if (context.session.get().step === "verify") startVerify();

    // Collapsed on purpose: a resume happens mid-recording, on a page the operator is trying
    // to drive. The chip states the step it came back to; opening it is one click.
    open = false;
    draw();

    logger.debug("Assistant resumed", { step: context.session.get().step });
  };

  const disable = async (opts?: TrackerWidgetDisableOptions): Promise<void> => {
    // Ordering matters: the recorder unpatches before anything else, and the store is
    // disposed before the key is removed, or its pending debounced write (or the next
    // `pagehide`) would put the session straight back.
    recorder?.stop();
    recorder = null;
    if (ticker !== null) {
      clearInterval(ticker);
      ticker = null;
    }
    unsubscribe?.();
    unsubscribe = null;
    unsubscribeSettings?.();
    unsubscribeSettings = null;
    settingsOpen = false;
    ctx?.session.dispose();
    if (ctx) render(null, ctx.host.mount);
    ctx?.host.destroy();

    if (opts?.forget) (ctx?.settings ?? createSettingsStore()).forget();
    ctx = null;
    open = false;

    setActive(false);
    clearSession();
  };

  return { enable, resume, disable };
};

export default createWidget;
