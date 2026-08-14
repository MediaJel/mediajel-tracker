import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { SnowplowTracker } from "@mediajel/tracker-core/snowplow";

// First-come-first-served and per bundle instance (N tags on one page = N×STORM_CAP).
// Boot-phase errors (load:*/guard:*) can claim slots before checkout-time errors fire —
// if volumes look wrong, check this bias first. Distinct environment|message pairs; never reset.
const STORM_CAP = 10;
const seen = new Set<string>();
let count = 0;

export default async (tracker: SnowplowTracker): Promise<void> => {
  observable.subscribe(({ errorEvent }) => {
    if (!errorEvent) return;
    const key = `${errorEvent.environment ?? ""}|${errorEvent.message ?? ""}`;
    if (seen.has(key) || count >= STORM_CAP) return; // dedupe + cap
    seen.add(key);
    count += 1;
    try {
      tracker.trackError(errorEvent);
    } catch {
      // The reporter must never throw — but a failed send must not burn the
      // dedupe slot or a storm-cap slot, so the same error can retry once the
      // SDK is healthy. (Adding to `seen` before the send stays: it suppresses
      // any re-entrant notify of the same error during trackError.)
      seen.delete(key);
      count -= 1;
    }
  });
};
