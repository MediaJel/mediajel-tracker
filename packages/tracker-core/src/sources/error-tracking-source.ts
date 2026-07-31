import observable from "@mediajel/tracker-core/utils/create-events-observable";

/**
 * Report an already-caught error into the observable's error channel.
 * Drop-in replacement for the legacy `window.tracker("trackError", …)` catch lines,
 * and the implementation behind the public `window.trackError` global.
 */
export const notifyError = (error: unknown, environment?: string): void => {
  // Strings keep their text (a plain-string report would otherwise become
  // "Unknown error" and collapse the dedupe key to one slot per environment).
  const message = typeof error === "string" ? error : (error as Error)?.message;
  observable.notify({
    errorEvent: { message, error: error as Error, environment },
  });
};

/** Wrap a synchronous block so any throw is captured. For new boundaries. */
export const captureError = (environment: string, callback: () => void): void => {
  try {
    callback();
  } catch (error) {
    notifyError(error, environment);
  }
};
