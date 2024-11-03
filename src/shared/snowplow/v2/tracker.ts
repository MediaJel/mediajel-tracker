import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/tracker";
import { initialize } from "src/shared/snowplow/v2/init";

const createSnowplowV2Tracker = (): SnowplowTracker => {
  return {
    initialize,
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
