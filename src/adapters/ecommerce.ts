import { SnowplowTracker } from 'src/shared/snowplow';
import observable from 'src/shared/utils/create-events-observable';

// TODO: Apply observable pattern to the transaction adapter

export default async (tracker: SnowplowTracker): Promise<void> => {
  const { context } = tracker;

  // We are subscribing to the observable to get the eccomerce events
  observable.subscribe(({ transactionEvent, addToCartEvent, removeFromCartEvent }) => {
    transactionEvent && tracker.ecommerce.trackTransaction(transactionEvent);
    addToCartEvent && tracker.ecommerce.trackAddToCart(addToCartEvent);
    removeFromCartEvent && tracker.ecommerce.trackRemoveFromCart(removeFromCartEvent);
  });

  // We are dynamically loading the data source publisher/notifier based on the environment
  switch (context.environment) {
    case "bigcommerce":
      import("src/shared/environment-data-sources/bigcommerce").then(({ default: load }): void => load());
      break;
    case "buddi":
      import("src/shared/environment-data-sources/buddi").then(({ default: load }): void => load());
      break;
    case "dutchieplus":
      import("src/shared/environment-data-sources/dutchie-plus").then(({ default: load }): void => load());
      break;
    case "dispense":
      import("src/shared/environment-data-sources/dispense").then(({ default: load }): void => load());
      break;

    default:
      console.warn("No event/environment specified, Only pageview is active");
      break;
  }
};
