import {
    CreateSnowplowTrackerInput, SnowplowTrackerEcommerceEvents
} from 'src/shared/snowplow/types';

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

export default createSnowplowV2TrackerEcommerceEventsHandlers;
