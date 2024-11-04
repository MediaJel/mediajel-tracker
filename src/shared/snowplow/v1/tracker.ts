import { CreateSnowplowTrackerInput, SnowplowTracker } from "src/shared/snowplow/types";
import createSnowplowV1TrackerEcommerceEventsHandlers from "src/shared/snowplow/v1/ecommerce";
import createSnowplowV1TrackerImpressionEventsHandlers from "src/shared/snowplow/v1/impressions";
import { initialize } from "src/shared/snowplow/v1/init";

const createSnowplowV1Tracker = (input: CreateSnowplowTrackerInput): SnowplowTracker => {
  return {
    context: input,
    initialize,
    ecommerce: createSnowplowV1TrackerEcommerceEventsHandlers(input),
    impressions: createSnowplowV1TrackerImpressionEventsHandlers(),
    trackSignup: (input) => {
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
      });
    },
    record: (input) => {
      window.tracker("trackSelfDescribingEvent", {
        schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
        data: input,
      });
    },
  };
};

export default createSnowplowV1Tracker;
