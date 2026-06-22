import observable from "@mediajel/tracker-core/utils/create-events-observable";

/**
 * Report an already-caught error into the observable's error channel.
 * Drop-in replacement for the legacy `window.tracker("trackError", …)` catch lines,
 * and the implementation behind the public `window.trackError` global.
 */
export const notifyError = (error: unknown, environment?: string): void => {
  observable.notify({
    errorEvent: { message: (error as Error)?.message, error: error as Error, environment },
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
