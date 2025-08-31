import { CreateSnowplowTrackerInput, SnowplowTrackerEcommerceEvents } from "src/shared/snowplow/types";

const createSnowplowV1TrackerEcommerceEventsHandlers = (
  input: CreateSnowplowTrackerInput,
): SnowplowTrackerEcommerceEvents => {
  const { appId, retailId, environment } = input;

  return {
    trackTransaction: (input) => {
      window.tracker(
        `addTrans`,
        input.id,
        input.affiliateId || (retailId ?? appId),
        input.total,
        input.tax,
        input.shipping,
        input.city,
        input.state,
        input.country,
        input.currency,
        [
          {
            schema: "iglu:com.mediajel.events/enhanced_transaction/jsonschema/1-0-1",
            data: {
              cart: environment,
              transaction_ids: input.alternativeTransactionIds,
              discount: input.discount,
              coupon_code: input.couponCode,
            },
          },
        ],
      );

      input.items.forEach((item) => {
        window.tracker(
          `addItem`,
          input.id,
          item.sku,
          item.name,
          item.category,
          item.unitPrice,
          item.quantity,
          input.currency,
        );
      });
      window.tracker(`trackTrans`);
    },
    trackAddToCart: (input) => {
      window.tracker(
        "trackAddToCart",
        input.sku,
        input.name,
        input.category,
        input.unitPrice,
        input.quantity,
        input.currency,
      );
    },
    trackRemoveFromCart: (input) => {
      window.tracker(
        "trackRemoveFromCart",
        input.sku,
        input.name,
        input.category,
        input.unitPrice,
        input.quantity,
        input.currency,
      );
    },
  };
};

export default createSnowplowV1TrackerEcommerceEventsHandlers;
