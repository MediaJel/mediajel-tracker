import {
  CartEvent,
  SnowplowBrowserTracker,
  SnowplowTracker,
  SnowplowTrackerInput,
  TransactionEvent,
} from "/src/shared/types";
import init from "/src/snowplow/standard/init";

const trackAddToCart = (tracker: SnowplowBrowserTracker) => {
  return {
    trackAddToCart(item: CartEvent) {
      // TODO: Add setUserId implementation
      tracker("trackAddToCart", {
        sku: item.sku,
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        currency: item.currency,
      });
    },
  };
};

const trackRemoveFromCart = (tracker: SnowplowBrowserTracker) => {
  return {
    trackRemoveFromCart(item: CartEvent) {
      // TODO: Add setUserId implementation
      tracker("trackRemoveFromCart", {
        sku: item.sku,
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        currency: item.currency,
      });
    },
  };
};

const trackTransaction = (tracker: SnowplowBrowserTracker) => {
  return {
    trackTransaction(transaction: TransactionEvent) {
      // TODO: Add setUserId implementation
      tracker("addTrans", {
        orderId: transaction.id,
        affiliation: "N/A",
        total: transaction.total,
        tax: transaction.tax,
        shipping: transaction.shipping,
        city: transaction.city,
        state: transaction.state,
        country: transaction.country,
        currency: transaction.currency,
      });

      transaction.items.forEach((item) => {
        tracker("addItem", {
          orderId: transaction.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.unitPrice,
          quantity: item.quantity,
          currency: item.currency,
        });
      });

      tracker("trackTrans");
    },
  };
};

const record = (tracker: SnowplowBrowserTracker, input: SnowplowTrackerInput) => {
  const schema = {
    event: {
      schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
      data: {
        appId: input.appId,
        cart: input.environment,
        version: input.version,
      },
    },
  };

  tracker("trackSelfDescribingEvent", schema);
};

/**
 * @category Snowplow
 * @description Function factory that creates a Snowplow Standard tracker instance.
 * The methods included in the tracker are specific to the Snowplow Standard tracker
 * also known as "v3" in the snowplow docs
 *
 * @see {@link https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/javascript-tracker/javascript-tracker-v3/tracking-events/ Snowplow v3 documentation}
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @returns {SnowplowTracker} Snowplow tracker instance
 *
 */
const createSnowplowStandardTracker = (input: SnowplowTrackerInput): SnowplowTracker => {
  const tracker = init(input);
  record(tracker, input);
  return {
    ...trackTransaction(tracker),
    ...trackAddToCart(tracker),
    ...trackRemoveFromCart(tracker),
  };
};

export default createSnowplowStandardTracker;
