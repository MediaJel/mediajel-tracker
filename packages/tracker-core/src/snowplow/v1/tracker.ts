import { CreateSnowplowTrackerInput, SnowplowTracker } from '@mediajel/tracker-core/snowplow/types';
import { initialize } from '@mediajel/tracker-core/snowplow/v1/init';

const createSnowplowV1Tracker = async (input: CreateSnowplowTrackerInput): Promise<SnowplowTracker> => {
  // Dynamically load only the handler the event needs (package-specifier form — see snowplow/tracker.ts).
  const loadEcommerce = async () =>
    (await import("@mediajel/tracker-core/snowplow/v1/ecommerce")).default(input);
  const loadImpressions = async () =>
    (await import("@mediajel/tracker-core/snowplow/v1/impressions")).default();

  return {
    context: input,
    initialize,
    // Load ecommerce handler only if the event is a transaction or if no event is specified
    ecommerce: (input.event === "transaction" || !input.event) ? (await loadEcommerce()) : undefined,
    impressions: input.event === "impression" ? (await loadImpressions()) : undefined,
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
        test,
      } = input;

      window.tracker("trackSelfDescribingEvent", {
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
