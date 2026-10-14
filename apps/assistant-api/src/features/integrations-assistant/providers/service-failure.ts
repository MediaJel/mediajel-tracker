/**
 * What a failed call to another service reads as.
 *
 * Every source in this module calls a service over HTTP, and each has to turn a call that threw into
 * a sentence an operator can act on. Said once here so they never drift into describing the same
 * failure two ways — the name of the service is the only part that differs.
 */

/** A call that ran out of time: `AbortSignal.timeout` names it, axios codes it. */
export const timedOut = (err: unknown): boolean => {
  const { name, code } = (err ?? {}) as { name?: string; code?: string };
  return name === "TimeoutError" || code === "ECONNABORTED" || code === "ETIMEDOUT";
};

export const unanswered = (err: unknown, service: string, timeoutMs: number): Error => {
  if (timedOut(err)) {
    return new Error(`${service} did not answer within ${timeoutMs / 1000} seconds.`);
  }
  return new Error(`${service} could not be reached (${err instanceof Error ? err.message : String(err)}).`);
};
