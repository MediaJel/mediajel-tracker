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

// Snowplow's application_error/1-0-1 schema rejects message > 2048 and
// stackTrace > 8192 characters, and a rejected report is a lost report.
// Clamp here, before the adapter builds its dedupe key, so two over-long
// reports that agree up to the cut also dedupe as one.
const MAX_ENVIRONMENT = 64;
const MAX_MESSAGE = 2048;
const MAX_STACK = 8192;
const clamp = (text: string, max: number): string => (text.length > max ? text.slice(0, max) : text);

/**
 * Report an already-caught error into the observable's error channel.
 * Drop-in replacement for the legacy `window.tracker("trackError", …)` catch lines,
 * and the implementation behind the public `window.trackError` global.
 */
export const notifyError = (error: unknown, environment?: string): void => {
  const env = typeof environment === "string" ? clamp(environment, MAX_ENVIRONMENT) : undefined;
  // Strings and .message carriers keep their text; everything else stringifies
  // so its report stays readable and its dedupe key stays distinct.
  const raw =
    typeof error === "string"
      ? error
      : typeof (error as Error)?.message === "string"
        ? (error as Error).message
        : stringifyThrown(error);
  // The v2 tracker sends "[env] message"; budget for that prefix so the
  // final string stays within the limit.
  const message = clamp(raw, MAX_MESSAGE - (env ? env.length + 3 : 0));
  // The SDK reads only error.stack. Hand it a copy with a trimmed stack
  // rather than mutating the caller's Error; the top frames are the ones
  // that matter and trimming the tail keeps them.
  const stack = (error as Error)?.stack;
  const reported =
    typeof stack === "string" && stack.length > MAX_STACK
      ? ({ name: (error as Error).name, message: (error as Error).message, stack: clamp(stack, MAX_STACK) } as Error)
      : (error as Error);
  observable.notify({
    errorEvent: { message, error: reported, environment: env },
  });
};
