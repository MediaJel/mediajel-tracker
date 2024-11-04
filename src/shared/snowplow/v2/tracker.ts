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
    trackSignup(input) {
      const {
        uuid,
        firstName,
        lastName,
        gender,
        emailAddress,
        hashedEmailAddress,
        address,
        city,
        state,
        phoneNumber,
        advertiser,
      } = input;
      window.tracker("trackSelfDescribingEvent", {
        event: {
          schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-2",
          data: {
            uuid,
            firstName,
            lastName,
            gender,
            emailAddress,
            hashedEmailAddress,
            address,
            city,
            state,
            phoneNumber,
            advertiser,
          },
        },
      });
    },
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
