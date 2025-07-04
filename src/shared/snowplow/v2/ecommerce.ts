import { CreateSnowplowTrackerInput, SnowplowTrackerEcommerceEvents } from "src/shared/snowplow/types";

const createSnowplowV2TrackerEcommerceEventsHandlers = (
  input: CreateSnowplowTrackerInput,
): SnowplowTrackerEcommerceEvents => {
  const { appId, retailId } = input;

  return {
    trackTransaction(input) {
      window.tracker(`addTrans`, {
        orderId: input.id,
        affiliation: input.affiliateId || (retailId ?? appId),
        total: input.total,
        tax: input.tax,
        shipping: input.shipping,
        city: input.city,
        state: input.state,
        country: input.country,
        currency: input.currency,
        context: [
          {
            schema: "iglu:com.mediajel.events/enhanced_transaction/jsonschema/1-0-0",
            data: {
              transaction_ids: input.alternativeTransactionIds,
              transaction_discount: input.discount,
              transaction_coupon_code: input.couponCode,
            },
          },
        ],
      });

      input.items.forEach((item) => {
        window.tracker(`addItem`, {
          orderId: item.orderId,
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.unitPrice,
          quantity: item.quantity,
          currency: item.currency,
        });
      });

      window.tracker(`trackTrans`);
    },
    trackAddToCart(input) {
      window.tracker("trackAddToCart", {
        sku: input.sku,
        name: input.name,
        category: input.category,
        unitPrice: input.unitPrice,
        quantity: input.quantity,
        currency: input.currency,
      });
    },
    trackRemoveFromCart(input) {
      window.tracker("trackRemoveFromCart", {
        sku: input.sku,
        name: input.name,
        category: input.category,
        unitPrice: input.unitPrice,
        quantity: input.quantity,
        currency: input.currency,
      });
    },
  };
};

export default createSnowplowV2TrackerEcommerceEventsHandlers;
