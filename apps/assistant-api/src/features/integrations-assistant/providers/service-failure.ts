/**
 * What a failed `fetch` to another MediaJel service reads as.
 *
 * Both sources in this module call a service over HTTP, and both have to turn a thrown fetch into a
 * sentence an operator can act on. Said once here so the two never drift into describing the same
 * failure two ways — the name of the service is the only part that differs.
 */
export const unanswered = (err: unknown, service: string, timeoutMs: number): Error => {
  if ((err as { name?: string })?.name === "TimeoutError") {
    return new Error(`${service} did not answer within ${timeoutMs / 1000} seconds.`);
  }
  return new Error(`${service} could not be reached (${err instanceof Error ? err.message : String(err)}).`);
};
