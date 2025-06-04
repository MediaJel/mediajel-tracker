import { CreateSnowplowTrackerInput, SnowplowTracker } from 'src/shared/snowplow/types';
import { initialize } from 'src/shared/snowplow/v2/init';

export const TransactionFilterPlugin = {
  EcommercePayloadValidator: function () {
    return {
      filter: (payload: Record<string, string>) => {
        if (payload.e === "tr") {
          const orderId = payload.tr_id;
          const rawTotal = payload.tr_tt;
          const total = parseFloat(rawTotal);

          const isValidId =
            typeof orderId === "string" &&
            orderId.trim().length > 0 &&
            orderId !== "undefined" &&
            orderId !== "null";
          const isValidTotal = !isNaN(total) && total >= 0;

          const shouldBlock = !isValidId || !isValidTotal;

          console.log("Snowplow transaction filter:", {
            orderId,
            rawTotal,
            isValidId,
            isValidTotal,
            shouldBlock,
            payload,
          });

          if (shouldBlock) {
            console.warn("❌ Blocked Snowplow transaction:", payload);
            return false;
          }
        }
        return true;
      },
    };
  },
};

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
