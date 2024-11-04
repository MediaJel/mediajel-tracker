import logger from "src/shared/logger";
import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/types";

// TODO: To use dynamic imports
const createSnowplowTracker = async (input: CreateSnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { appId, collector, event } = input;
  logger.info(`Creating Snowplow tracker for version ${input.version}`);
  const isLegacyTracker = input.version === "v1";

  const createSnowplowV1Tracker = await import(`src/shared/snowplow/v1/tracker`).then(
    ({ default: createSnowplowV1Tracker }) => createSnowplowV1Tracker
  );

  const createSnowplowV2Tracker = await import(`src/shared/snowplow/v2/tracker`).then(
    ({ default: createSnowplowV2Tracker }) => createSnowplowV2Tracker
  );

  const tracker = isLegacyTracker ? createSnowplowV1Tracker(input) : createSnowplowV2Tracker(input);

  tracker.initialize({ appId, collector, event });
  tracker.record(input);

  return tracker;
};

export default createSnowplowTracker;
