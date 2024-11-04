import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/types";
import createSnowplowV2TrackerEcommerceEventsHandlers from "src/shared/snowplow/v2/ecommerce";
import createSnowplowV2TrackerImpressionEventsHandlers from "src/shared/snowplow/v2/impressions";
import { initialize } from "src/shared/snowplow/v2/init";

const createSnowplowV2Tracker = (input: CreateSnowplowTrackerInput): SnowplowTracker => {
  return {
    context: input,
    initialize,
    ecommerce: createSnowplowV2TrackerEcommerceEventsHandlers(input),
    impressions: createSnowplowV2TrackerImpressionEventsHandlers(input),
    record(input) {
      window.tracker("trackSelfDescribingEvent", {
        event: {
          schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
          data: input,
        },
      });
    },
  };
};

export default createSnowplowV2Tracker;
