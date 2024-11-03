import logger from "src/shared/logger";
import createSnowplowV1Tracker from "src/shared/snowplow/v1/tracker";
import createSnowplowV2Tracker from "src/shared/snowplow/v2/tracker";
import { QueryStringContext } from "src/shared/types";

export interface SnowplowTracker {
  initialize: (input: CreateSnowplowTrackerInput) => void;
  /** Mainly used for book-keeping purposes so we can document params & the tag itself */
  record: (input: QueryStringContext) => void;
}

export interface CreateSnowplowTrackerInput {
  appId: string;
  collector: string;
  event: string;
  version: string;
}
const createSnowplowTracker = (input: CreateSnowplowTrackerInput) => {
  logger.info(`Creating Snowplow tracker for version ${input.version}`);
  const isLegacyTracker = input.version === "v1";
  const tracker = isLegacyTracker ? createSnowplowV1Tracker() : createSnowplowV2Tracker();

  tracker.initialize(input);
  return {};
};

export default createSnowplowTracker;
