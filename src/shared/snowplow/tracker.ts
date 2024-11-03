import logger from "src/shared/logger";
import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/types";
import createSnowplowV1Tracker from "src/shared/snowplow/v1/tracker";
import createSnowplowV2Tracker from "src/shared/snowplow/v2/tracker";
import { QueryStringContext } from "src/shared/types";

// TODO: To use dynamic imports
const createSnowplowTracker = (input: CreateSnowplowTrackerInput): SnowplowTracker => {
  const { appId, collector, event } = input;
  logger.info(`Creating Snowplow tracker for version ${input.version}`);
  const isLegacyTracker = input.version === "v1";
  const tracker = isLegacyTracker ? createSnowplowV1Tracker(input) : createSnowplowV2Tracker(input);

  tracker.initialize({ appId, collector, event });
  tracker.record(input);

  return tracker;
};

export default createSnowplowTracker;
