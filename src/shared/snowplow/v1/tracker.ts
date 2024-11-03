import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/tracker";
import { initialize } from "src/shared/snowplow/v1/init";

const createSnowplowV1Tracker = (): SnowplowTracker => {
  return {
    initialize,
    record: (input) => {
      window.tracker("trackSelfDescribingEvent", {
        schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
        data: input,
      });
    },
  };
};

export default createSnowplowV1Tracker;
