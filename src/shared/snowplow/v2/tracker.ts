import { CreateSnowplowTrackerInput, SnowplowTracker } from 'src/shared/snowplow/types';
import { initialize } from 'src/shared/snowplow/v2/init';

const createSnowplowV2Tracker = async (input: CreateSnowplowTrackerInput): Promise<SnowplowTracker> => {
  const loadImpressionHandler = async () => {
    return await import(`src/shared/snowplow/v2/impressions`).then(({ default: load }) => load());
  };
  const loadEcommerceHandler = async () => {
    return await import(`src/shared/snowplow/v2/ecommerce`).then(({ default: load }) => load(input));
  };

  return {
    context: input,
    initialize,
    // Load ecommerce handler only if the event is a transaction or if no event is specified
    ecommerce: (input.event === "transaction" || !input.event) && (await loadEcommerceHandler()),
    impressions: input.event === "impression" && (await loadImpressionHandler()),
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
        test,
      } = input;
      window.tracker("trackSelfDescribingEvent", {
        event: {
          schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-4",
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
            test,
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
