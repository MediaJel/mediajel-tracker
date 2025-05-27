import { CreateSnowplowTrackerInput, SnowplowTracker } from 'src/shared/snowplow/types';
import { initialize } from 'src/shared/snowplow/v1/init';

const createSnowplowV1Tracker = async (input: CreateSnowplowTrackerInput): Promise<SnowplowTracker> => {
  // We only load the impressions handler if the event is an impression
  const loadImpressionHandler = async () => {
    return await import(`src/shared/snowplow/v1/impressions`).then(({ default: load }) => load());
  };

  const loadEcommerceHandler = async () => {
    return await import(`src/shared/snowplow/v1/ecommerce`).then(({ default: load }) => load(input));
  };


  return {
    context: input,
    initialize,
    // Load ecommerce handler only if the event is a transaction or if no event is specified
    ecommerce: (input.event === "transaction" || !input.event) && (await loadEcommerceHandler()),
    impressions: input.event === "impression" && (await loadImpressionHandler()),
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
