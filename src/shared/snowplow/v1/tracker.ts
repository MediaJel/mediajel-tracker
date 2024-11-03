import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/types";
import createSnowplowV1TrackerEcommerceEventsHandlers from "src/shared/snowplow/v1/ecommerce";
import { initialize } from "src/shared/snowplow/v1/init";

const createSnowplowV1Tracker = (input: CreateSnowplowTrackerInput): SnowplowTracker => {
  return {
    context: input,
    initialize,
    ecommerce: createSnowplowV1TrackerEcommerceEventsHandlers(input),
    record: (input) => {
      window.tracker("trackSelfDescribingEvent", {
        schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
        data: input,
      });
    },
  };
};

export default createSnowplowV1Tracker;
