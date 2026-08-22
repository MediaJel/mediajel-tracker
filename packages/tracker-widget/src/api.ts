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
  /** Deploy credential AND the access credential for MediaJel's assistant service. */
  githubToken?: string;
  actor?: TrackerWidgetActor;
  /** Persist settings to localStorage instead of sessionStorage ("Remember on this device"). */
  remember?: boolean;
  /**
   * Whether the work order starts open. `enable()` opens it — an explicit enable is a request
   * to work — and `resume()` always comes back collapsed, so a recording that spans pages
   * never covers the checkout the operator is trying to drive.
   */
  open?: boolean;
}

/** Options for `window.disableTrackerWidget()`. */
export interface TrackerWidgetDisableOptions {
  /**
   * Also drop the persisted settings (GitHub token, actor). The recorded session is always
   * cleared by `disable()` itself — exiting the assistant ends the work order; settings are the
   * one thing an operator may choose to keep.
   */
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
