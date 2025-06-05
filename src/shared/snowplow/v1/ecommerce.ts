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
        window.tracker(
          `addItem`,
          input.ids,
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
  };
};

export default createSnowplowV1TrackerEcommerceEventsHandlers;
