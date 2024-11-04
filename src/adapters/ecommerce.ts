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

  // TODO: Add comments for dynamic tracking of events tracked
  // We are dynamically loading the data source publisher/notifier based on the environment
  //* WARNING: Do not use absolute imports when dynamically loading modules
  switch (context.environment) {
    case "bigcommerce":
      import("../shared/environment-data-sources/bigcommerce").then(({ default: load }): void => load());
      break;
    case "buddi":
      import("../shared/environment-data-sources/buddi").then(({ default: load }): void => load());
      break;
    case "dispense":
      import("../shared/environment-data-sources/dispense").then(({ default: load }): void => load());
      break;
    case "dutchie-iframe":
      import("../shared/environment-data-sources/dutchie-iframe").then(({ default: load }): void => load());
      break;
    case "dutchie-subdomain":
      import("../shared/environment-data-sources/dutchie-subdomain").then(({ default: load }): void => load());
      break;
    case "dutchieplus":
      import("../shared/environment-data-sources/dutchie-plus").then(({ default: load }): void => load());
      break;
    case "ecwid":
      import("../shared/environment-data-sources/ecwid").then(({ default: load }): void => load());
      break;
    case "grassdoor":
      import("../shared/environment-data-sources/grassdoor").then(({ default: load }): void => load());
      break;
    case "greenrush":
      import("../shared/environment-data-sources/greenrush").then(({ default: load }): void => load());
      break;
    default:
      console.warn("No event/environment specified, Only pageview is active");
      break;
  }
};
