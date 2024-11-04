import { SnowplowTracker } from "src/shared/snowplow";

// TODO: Make dynamic import
export default async (tracker: SnowplowTracker): Promise<void> => {
  const { environment } = tracker.context;

  switch (environment) {
    case "liquidm":
      tracker.impressions.trackLiquidmImpression({ ...tracker.context });
      break;
    case "mantis":
      tracker.impressions.trackMantisImpression({ ...tracker.context });
      break;
  }
};
