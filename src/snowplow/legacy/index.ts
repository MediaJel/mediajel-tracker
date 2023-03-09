import {
  CartEvent,
  QueryStringContext,
  SnowplowBrowserTracker,
  SnowplowTracker,
  TransactionEvent,
} from "/src/shared/types";
import init from "/src/snowplow/legacy/init";

const trackAddToCart = (tracker: SnowplowBrowserTracker) => {
  return {
    trackAddToCart(item: CartEvent) {
      tracker("trackAddToCart", item.sku, item.name); // Todo: Finish this
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

const createSnowplowLegacyTracker = (context: QueryStringContext): SnowplowTracker => {
  const tracker = init(context);

  return {
    ...trackTransaction(tracker),
  };
};

export default createSnowplowLegacyTracker;
