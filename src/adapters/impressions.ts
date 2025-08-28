import { SnowplowTracker } from "src/shared/snowplow";

// TODO: Make dynamic import
export default async (tracker: SnowplowTracker): Promise<void> => {
  const { environment } = tracker.context;

  const environments = environment

  for (const env of environments) {
    switch (env) {
      case "liquidm":
        tracker.impressions.trackLiquidmImpression({ ...tracker.context });
        break;
      case "mantis":
        tracker.impressions.trackMantisImpression({ ...tracker.context });
        break;
      case "simplifi":
        tracker.impressions.trackSimplifiImpression({ ...tracker.context });
        break;
    }
  }
};
