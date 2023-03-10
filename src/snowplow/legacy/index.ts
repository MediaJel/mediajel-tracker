import init from "/src/snowplow/legacy/init";

import {
  CartEvent,
  SnowplowBrowserTracker,
  SnowplowTracker,
  SnowplowTrackerInput,
  TransactionEvent,
} from "/src/shared/types";

const trackAddToCart = (tracker: SnowplowBrowserTracker) => {
  return {
    trackAddToCart(item: CartEvent) {
      // TODO: Add setUserId implementation
      tracker("trackAddToCart", item.sku, item.name, item.category, item.unitPrice, item.quantity, item.currency);
    },
  };
};

const trackRemoveFromCart = (tracker: SnowplowBrowserTracker) => {
  return {
    trackRemoveFromCart(item: CartEvent) {
      // TODO: Add setUserId implementation
      tracker("trackRemoveFromCart", item.sku, item.name, item.category, item.unitPrice, item.quantity, item.currency);
    },
  };
};

const trackTransaction = (tracker: SnowplowBrowserTracker) => {
  return {
    trackTransaction(transaction: TransactionEvent) {
      // TODO: Add setUserId implementation
      tracker(
        "addTrans",
        transaction.id,
        "N/A",
        transaction.total,
        transaction.tax,
        transaction.shipping,
        transaction.city,
        transaction.state,
        transaction.country,
        transaction.currency
      );
      transaction.items.forEach((item) => {
        const { name, category, currency, orderId, quantity, sku, unitPrice } = item;
        tracker("addItem", orderId, sku, name, category, unitPrice, quantity, currency);
      });

      tracker("trackTrans");
    },
  };
};

const record = (tracker: SnowplowBrowserTracker, input: SnowplowTrackerInput) => {
  const schema = {
    schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
    data: {
      appId: input.appId,
      cart: input.environment,
      version: input.version,
    },
  };

  tracker("trackSelfDescribingEvent", schema);
};

/**
 * @description Function factory that creates a Snowplow Legacy tracker instance.
 * The methods included in the tracker are specific to the Snowplow Legacy tracker
 * also known as "v2" in the snowplow docs
 *
 * @see {@link https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/javascript-tracker/javascript-tracker-v2/tracking-specific-events/ Snowplow v2 documentation}
 * @param {SnowplowTrackerInput} input Input object for the Snowplow Legacy tracker
 * @returns {SnowplowTracker} Snowplow Legacy tracker
 *
 */
const createSnowplowLegacyTracker = (input: SnowplowTrackerInput): SnowplowTracker => {
  const tracker = init(input);
  record(tracker, input);

  return {
    ...trackTransaction(tracker),
    ...trackAddToCart(tracker),
    ...trackRemoveFromCart(tracker),
  };
};

export default createSnowplowLegacyTracker;
