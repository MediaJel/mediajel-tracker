import logger from "@mediajel/assistant-core/log";

/**
 * While Verify is live, the four tracker entry points are accessor properties that CAPTURE
 * and never forward — nothing reaches the collector, and the tag's dedup keys are never
 * written (the real functions are where that happens).
 *
 * Accessors, not plain assignment, because the adapters chunk assigns these late and again
 * on some environments (plain data writes would silently overwrite a wrapper installed
 * first). And once installed they are NOT restored for the rest of the page's lifetime: the
 * generated code attached listeners we cannot un-attach, and restoring the real functions
 * would let the operator's next test action send a real event. A reload restores live
 * tracking — the UI says so.
 */

export const INTERCEPTED = ["trackTrans", "trackSignUp", "addToCart", "removeFromCart"] as const;
export type InterceptedName = (typeof INTERCEPTED)[number];

export interface InterceptedCall {
  name: InterceptedName;
  payload: unknown;
  /** Epoch ms. */
  at: number;
  /** True when the call fired from a replayed dataLayer entry, not a fresh action. */
  fromReplay: boolean;
}

export interface VerifyInterceptor {
  /** Swap the capture sink (a re-run replaces the collector without reinstalling). */
  onCapture(sink: ((call: InterceptedCall) => void) | null): void;
  /** Marks captures made while a shim replays pre-existing dataLayer entries. */
  setReplaying(replaying: boolean): void;
  installed: true;
}

let installed: VerifyInterceptor | null = null;

export const installVerifyInterceptor = (): VerifyInterceptor => {
  if (installed) return installed;

  let sink: ((call: InterceptedCall) => void) | null = null;
  let replaying = false;

  for (const name of INTERCEPTED) {
    const wrapper = (payload: unknown): void => {
      logger.debug(`Verify intercepted window.${name} — nothing was sent.`);
      sink?.({ name, payload, at: Date.now(), fromReplay: replaying });
    };
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        get: () => wrapper,
        // The adapters chunk (or an environment re-bind) assigning the real function later
        // must not displace the interceptor; the assignment is absorbed.
        // eslint-disable-next-line no-setter-return -- absorbing the assignment IS the point
        set: () => undefined,
      });
    } catch (err) {
      logger.warn(`Could not intercept window.${name}:`, err);
    }
  }

  installed = {
    onCapture: (next) => {
      sink = next;
    },
    setReplaying: (next) => {
      replaying = next;
    },
    installed: true,
  };
  return installed;
};
