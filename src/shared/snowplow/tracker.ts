import logger from "src/shared/logger";
import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/types";

const createSnowplowTracker = async (input: CreateSnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { appId, collector, event } = input;
  logger.info(`Creating Snowplow tracker for version ${input.version}`);
  const isLegacyTracker = input.version === "v1";

  const createSnowplowV1Tracker = async () => {
    return await import(`src/shared/snowplow/v1/tracker`).then(
      async ({ default: createSnowplowV1Tracker }) => await createSnowplowV1Tracker(input)
    );
  };

  const createSnowplowV2Tracker = async () => {
    return await import(`src/shared/snowplow/v2/tracker`).then(
      async ({ default: createSnowplowV2Tracker }) => await createSnowplowV2Tracker(input)
    );
  };

  const tracker = isLegacyTracker ? await createSnowplowV1Tracker() : await createSnowplowV2Tracker();

  tracker.initialize({ appId, collector, event });
  tracker.record(input);

  return tracker;
};

export default createSnowplowTracker;
