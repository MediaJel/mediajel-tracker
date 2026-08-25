import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { SnowplowTracker } from "@mediajel/tracker-core/snowplow";

// First-come-first-served and per bundle instance (N tags on one page = N×STORM_CAP).
// Boot-phase errors (load:*/guard:*) can claim slots before checkout-time errors fire —
// if volumes look wrong, check this bias first. Distinct environment|message pairs; never reset.
const STORM_CAP = 10;
const seen = new Set<string>();

// Synchronous on purpose: callers rely on the subscription existing the moment
// this returns, before anything downstream can notify.
export default (tracker: SnowplowTracker): void => {
  observable.subscribe(({ errorEvent }) => {
    if (!errorEvent) return;
    if (seen.size >= STORM_CAP) return; // cap — integer check before building the key
    const key = `${errorEvent.environment ?? ""}|${errorEvent.message ?? ""}`;
    if (seen.has(key)) return; // dedupe
    seen.add(key);
    try {
      tracker.trackError(errorEvent);
    } catch {
      // The reporter must never throw — but a failed send must not burn the
      // dedupe slot or a storm-cap slot, so the same error can retry once the
      // SDK is healthy. (Adding to `seen` before the send stays: it suppresses
      // any re-entrant notify of the same error during trackError.)
      seen.delete(key);
    }
  });
};
