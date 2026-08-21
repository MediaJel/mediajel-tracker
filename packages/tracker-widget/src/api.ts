/** Provider the widget talks to. `gateway` is the Vercel AI Gateway. */
export type TrackerWidgetProvider = "gateway" | "openai" | "anthropic" | "google";

/** Who the deploy commit is attributed to. */
export interface TrackerWidgetActor {
  name?: string;
  email?: string;
}

/**
 * Optional values an operator can hand `window.enableTrackerWidget()` so they don't have to
 * retype them in Settings. Everything here is also settable from the UI.
 */
export interface TrackerWidgetPrefill {
  provider?: TrackerWidgetProvider;
  model?: string;
  apiKey?: string;
  githubToken?: string;
  actor?: TrackerWidgetActor;
  /** Persist settings to localStorage instead of sessionStorage ("Remember on this device"). */
  remember?: boolean;
  /** Open the panel immediately instead of mounting collapsed. */
  open?: boolean;
}

/** Options for `window.disableTrackerWidget()`. */
export interface TrackerWidgetDisableOptions {
  /** Also drop persisted settings and the recorded session. */
  forget?: boolean;
}

/**
 * What the lazy chunk's `createWidget(context)` returns. The stub in apps/tracker holds
 * exactly one of these per page and routes the two window functions into it.
 */
export interface TrackerWidget {
  /** Mount the UI and start a session. Called by `window.enableTrackerWidget`. */
  enable(prefill?: TrackerWidgetPrefill): Promise<void>;
  /** Re-mount after a navigation, only when a session is already active in this tab. */
  resume(): Promise<void>;
  /** Unmount and stop recording. Called by `window.disableTrackerWidget`. */
  disable(opts?: TrackerWidgetDisableOptions): Promise<void>;
}
