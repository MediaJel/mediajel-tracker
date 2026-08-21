import { QueryStringContext } from "@mediajel/tracker-core/types";
import { guard } from "@mediajel/tracker-core/utils/guard";
import { TrackerWidget, TrackerWidgetDisableOptions, TrackerWidgetPrefill } from "@mediajel/tracker-widget/api";
import { WidgetContext } from "@mediajel/tracker-widget/context";
import logger from "@mediajel/tracker-widget/log";
import { snapshotTracker } from "@mediajel/tracker-widget/recorder/context";
import { Recorder, createRecorder } from "@mediajel/tracker-widget/recorder/recorder";
import { captureRuntime } from "@mediajel/tracker-widget/runtime";
import { generateTag } from "@mediajel/tracker-widget/ai/generate";
import { canGenerate } from "@mediajel/tracker-widget/state/machine";
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
export const createWidget = (tag: QueryStringContext): TrackerWidget => {
  let ctx: WidgetContext | null = null;
  let recorder: Recorder | null = null;
  let unsubscribe: (() => void) | null = null;
  let unsubscribeSettings: (() => void) | null = null;
  let ticker: ReturnType<typeof setInterval> | null = null;
  let open = false;
  let settingsOpen = false;
  let generationAbort: AbortController | null = null;

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
      ctx?.session.transition("verify");
      // The on-page runner arrives with the next build; the step and its body are real.
    }, "widget-verify"),

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

  const generateBlocked = (): string => {
    if (!ctx) return "";
    if (ctx.session.get().markedIds.length === 0) return "Pin at least one event as evidence first.";
    const settings = ctx.settings.get();
    if (!settings.apiKey.trim()) return "Add a provider API key — Generate opens Settings for you.";
    if (!settings.acknowledgedDataSharing) return "Tick the data-sharing acknowledgement in Settings.";
    return "";
  };

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
    render(
      h(App, {
        context: ctx.tag,
        session: ctx.session.get(),
        settings: ctx.settings.get(),
        status: snapshotTracker(ctx),
        handlers,
        generateBlocked: generateBlocked(),
        open,
        onToggleOpen,
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
