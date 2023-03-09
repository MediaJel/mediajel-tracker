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
      tracker("trackAddToCart", item.sku, item.name, item.category, item.unitPrice, item.quantity, item.currency);
    },
  };
};

const trackRemoveFromCart = (tracker: SnowplowBrowserTracker) => {
  return {
    trackRemoveFromCart(item: CartEvent) {
      tracker("trackRemoveFromCart", item.sku, item.name, item.category, item.unitPrice, item.quantity, item.currency);
    },
  };
};

const trackTransaction = (tracker: SnowplowBrowserTracker) => {
  return {
    trackTransaction(transaction: TransactionEvent) {
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

// TODO: Add setUserId implementation
const createSnowplowLegacyTracker = (context: SnowplowTrackerInput): SnowplowTracker => {
  const tracker = init(context);
  return {
    ...trackTransaction(tracker),
    ...trackAddToCart(tracker),
    ...trackRemoveFromCart(tracker),
  };
};

export default createSnowplowLegacyTracker;
