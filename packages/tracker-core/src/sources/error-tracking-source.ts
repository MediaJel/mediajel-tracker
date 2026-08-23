import observable from "@mediajel/tracker-core/utils/create-events-observable";

// Non-Error, non-string throws (bare objects, numbers, null) would otherwise
// report as "Unknown error" and share one dedupe slot per environment. The cap
// bounds the message if the thrown value carries a host payload.
const MAX_STRINGIFIED_MESSAGE = 150;
const stringifyThrown = (value: unknown): string => {
  let text: string | undefined;
  try {
    text = JSON.stringify(value);
  } catch {
    /* circular or hostile toJSON */
  }
  return (text ?? String(value)).slice(0, MAX_STRINGIFIED_MESSAGE);
};

/**
 * Report an already-caught error into the observable's error channel.
 * Drop-in replacement for the legacy `window.tracker("trackError", …)` catch lines,
 * and the implementation behind the public `window.trackError` global.
 */
export const notifyError = (error: unknown, environment?: string): void => {
  // Strings and .message carriers keep their text; everything else stringifies
  // so its report stays readable and its dedupe key stays distinct.
  const message =
    typeof error === "string"
      ? error
      : typeof (error as Error)?.message === "string"
        ? (error as Error).message
        : stringifyThrown(error);
  observable.notify({
    errorEvent: { message, error: error as Error, environment },
  });
};
