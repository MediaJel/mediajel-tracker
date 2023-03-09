import {
  CartEvent,
  QueryStringContext,
  SnowplowBrowserTracker,
  SnowplowTracker,
  TransactionEvent,
} from "/src/shared/types";
import init from "/src/snowplow/standard/init";

const trackAddToCart = (tracker: SnowplowBrowserTracker) => {
  return {
    trackAddToCart(item: CartEvent) {
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

const createSnowplowStandardTracker = (context: QueryStringContext): SnowplowTracker => {
  const tracker = init(context);
  return {
    ...trackTransaction(tracker),
    ...trackAddToCart(tracker),
    ...trackRemoveFromCart(tracker),
  };
};

export default createSnowplowStandardTracker;
