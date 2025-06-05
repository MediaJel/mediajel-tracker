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
      const {
        ids,
        affiliateId,
        total,
        tax,
        shipping,
        discount,
        coupon_code,
        payment_method,
        total_quantity,
        city,
        state,
        country,
        currency,
      } = input;

      window.tracker("trackSelfDescribingEvent", {
        event: {
          schema: "iglu:com.mediajel.events/enhanced_transaction/jsonschema/1-0-0",
          data: {
            transaction_ids: ids,
            transaction_affiliation: affiliateId,
            transaction_total: total,
            transaction_tax: tax,
            transaction_shipping: shipping,
            transaction_discount: discount || 0,
            transaction_coupon_code: coupon_code || "N/A",
            transaction_payment_method: payment_method || "N/A",
            transaction_total_quantity: total_quantity || 1,
            transaction_city: city,
            transaction_state: state,
            transaction_country: country,
            transaction_currency: currency,
          },
        }
      });

      input.items.forEach((item) => {
        window.tracker(`addItem`, {
          orderId: ids,
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
  };
};

export default createSnowplowV2TrackerEcommerceEventsHandlers;
