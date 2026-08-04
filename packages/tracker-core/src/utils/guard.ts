import logger from "@mediajel/tracker-core/logger";
import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";

/**
 * Wraps a callback so any exception it throws is logged (via our logger),
 * reported through the error funnel, and swallowed — it never propagates onto
 * the client's page. Preserves args, `this`, and the return value on the happy
 * path. Use for every callback we register with the browser or a third party
 * (event listeners, fetch/XHR interceptors, observers, timers, dataLayer.push
 * overrides).
 *
 * Reports use the `guard:<label>` environment, distinguishing safety-net catches
 * (coarse channel attribution) from a source's own notifyError catches (precise
 * environment attribution) — a `guard:*` report is a signal that instrumentation
 * is missing closer to the throw.
 *
 * Bundle note: guard is on the entry path (index.ts → retail-id-parser → guard),
 * so anything imported here — currently logger and notifyError (which pulls in
 * the events observable) — ships in the always-loaded entry bundle, not a lazy
 * chunk. It also has ~10 importers across sources/. Weigh new imports accordingly.
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
      try {
        notifyError(err, `guard:${label}`);
      } catch {
        /* the boundary itself must never throw onto the client's page */
      }
      return undefined;
    }
  };
};

export default guard;
