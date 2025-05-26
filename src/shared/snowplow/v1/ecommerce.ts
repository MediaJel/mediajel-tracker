import {
    CreateSnowplowTrackerInput, SnowplowTrackerEcommerceEvents
} from 'src/shared/snowplow/types';

const createSnowplowV1TrackerEcommerceEventsHandlers = (
  input: CreateSnowplowTrackerInput,
): SnowplowTrackerEcommerceEvents => {
  const { appId, retailId } = input;

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

    trackEnhancedTransaction: (input) => {
      window.trackTrans({
        id: input.id,
        affiliation: input.affiliation,
        total: input.total,
        tax: input.tax,
        shipping: input.shipping,
        discount: input.discount,
        coupon_code: input.coupon_code,
        payment_method: input.payment_method,
        quantity: input.quantity,
        city: input.city,
        state: input.state,
        country: input.country,
        currency: input.currency,
        items: input.items.map((item) => {
          return {
            orderId: item.orderId,
            sku: item.sku,
            name: item.name,
            category: item.category,
            unitPrice: item.unitPrice,
            quantity: item.quantity,
            currency: item.currency,
          };
        }
        ) || [],
      })
    },
  };
};

export default createSnowplowV1TrackerEcommerceEventsHandlers;
