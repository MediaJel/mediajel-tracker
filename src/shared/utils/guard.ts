import logger from "src/shared/logger";

/**
 * Wraps a callback so any exception it throws is logged (via our logger) and
 * swallowed — it never propagates onto the client's page. Preserves args, `this`,
 * and the return value on the happy path. Use for every callback we register with
 * the browser or a third party (event listeners, fetch/XHR interceptors, observers,
 * timers, dataLayer.push overrides).
 *
 * @param fn    the callback to protect
 * @param label short tag for the log line (e.g. "xhr-response", "post-message")
 */
export const guard = <A extends any[], R>(
  fn: (...args: A) => R,
  label = "callback",
): ((...args: A) => R | undefined) => {
  return function (this: unknown, ...args: A): R | undefined {
    try {
      return fn.apply(this, args);
    } catch (err) {
      logger.error(`Tracker callback "${label}" threw and was suppressed:`, err);
      return undefined;
    }
  };
};

export default guard;
