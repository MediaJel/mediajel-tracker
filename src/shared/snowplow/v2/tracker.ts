import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/types";
import createSnowplowV2TrackerEcommerceEventsHandlers from "src/shared/snowplow/v2/ecommerce";
import { initialize } from "src/shared/snowplow/v2/init";

const createSnowplowV2Tracker = (input: CreateSnowplowTrackerInput): SnowplowTracker => {
  return {
    initialize,
    ecommerce: createSnowplowV2TrackerEcommerceEventsHandlers(input),
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
