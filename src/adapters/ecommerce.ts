import logger from 'src/shared/logger';
import { SnowplowTracker } from 'src/shared/snowplow';
import observable from 'src/shared/utils/create-events-observable';

export default async (tracker: SnowplowTracker): Promise<void> => {
  const { context } = tracker;

  // We are subscribing to the observable to get the eccomerce events
  observable.subscribe(({ transactionEvent, addToCartEvent, removeFromCartEvent }) => {
    transactionEvent && tracker.ecommerce.trackTransaction(transactionEvent);
    addToCartEvent && tracker.ecommerce.trackAddToCart(addToCartEvent);
    removeFromCartEvent && tracker.ecommerce.trackRemoveFromCart(removeFromCartEvent);
  });

  // We are dynamically loading the data source publisher/notifier based on the environment
  //* WARNING: Do not use absolute imports when dynamically loading modules
  switch (context.environment) {
    case "bigcommerce":
      import("../shared/environment-data-sources/bigcommerce").then(({ default: load }): void => load());
      // description: "bigcommerce is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "blaze":
      import("../shared/environment-data-sources/blaze").then(({ default: load }): void => load());
      // description: "blaze is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "buddi":
      import("../shared/environment-data-sources/buddi").then(({ default: load }): void => load());
      // description: "buddi is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "dispense":
      import("../shared/environment-data-sources/dispense").then(({ default: load }): void => load());
      // description: "dispense is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "drupal":
      import("../shared/environment-data-sources/drupal").then(({ default: load }): void => load());
      // description: "drupal is just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "dutchie":
      import("../shared/environment-data-sources/dutchie").then(({ default: load }): void => load());
      // description: "dutchie is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "ecwid":
      import("../shared/environment-data-sources/ecwid").then(({ default: load }): void => load());
      // description: "ecwid is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "foxy":
      import("../shared/environment-data-sources/foxy").then(({ default: load }): void => load());
      // description: "foxy is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "grassdoor":
      import("../shared/environment-data-sources/grassdoor").then(({ default: load }): void => load());
      // description: "grassdoor is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "greenrush":
      import("../shared/environment-data-sources/greenrush").then(({ default: load }): void => load());
      // description: "greenrush is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "iqmetrix":
      import("../shared/environment-data-sources/iqmetrix").then(({ default: load }): void => load());
      // description: "iqmetrix is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "jane":
      import("../shared/environment-data-sources/jane").then(({ default: load }): void => load());
      // description: "jane is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "leafly":
      import("../shared/environment-data-sources/leafly").then(({ default: load }): void => load());
      // description: "leafly is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "lightspeed":
      import("../shared/environment-data-sources/lightspeed").then(({ default: load }): void => load());
      // description: "lightspeed is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "magento":
      import("../shared/environment-data-sources/magento").then(({ default: load }): void => load());
      // description: "magento is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "meadow":
      import("../shared/environment-data-sources/meadow").then(({ default: load }): void => load());
      // description: "meadow is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "olla":
      import("../shared/environment-data-sources/olla").then(({ default: load }): void => load());
      // description: "olla is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "shopify":
      import("../shared/environment-data-sources/shopify").then(({ default: load }): void => load());
      // description: "shopify is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "square":
      import("../shared/environment-data-sources/square").then(({ default: load }): void => load());
      // description: "square is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "sticky-leaf":
      import("../shared/environment-data-sources/sticky-leaf").then(({ default: load }): void => load());
      // description: "sticky-leaf is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "sweed":
      import("../shared/environment-data-sources/sweed").then(({ default: load }): void => load());
      // description: "sweed is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "tymber":
      import("../shared/environment-data-sources/tymber").then(({ default: load }): void => load());
      // description: "tymber is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "ticketmaster":
      import("../shared/environment-data-sources/ticketmaster").then(({ default: load }): void => load());
      // description: "ticketmaster is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "ticketure":
      import("../shared/environment-data-sources/ticketure").then(({ default: load }): void => load());
      // description: "ticketmaster is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "tnew":
        import("../shared/environment-data-sources/tnew").then(({ default: load }): void => load());
        // description: "tnew is a just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
    case "weave":
      import("../shared/environment-data-sources/weave").then(({ default: load }): void => load());
      // description: "weave is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "webjoint":
      import("../shared/environment-data-sources/webjoint").then(({ default: load }): void => load());
      // description: "webjoint is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "wefunder":
      import("../shared/environment-data-sources/wefunder").then(({ default: load }): void => load());
      // description: "wefunder is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "wix":
      import("../shared/environment-data-sources/wix").then(({ default: load }): void => load());
      // description: "wix is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "woocommerce":
      import("../shared/environment-data-sources/woocommerce").then(({ default: load }): void => load());
      // description: "woocommerce is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "yotpo":
      import("../shared/environment-data-sources/yotpo").then(({ default: load }): void => load());
      // description: "yotpo is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;
    case "thirdparty":
      import("../shared/environment-data-sources/thirdparty").then(({ default: load }): void => load());
      // description: "thirdparty is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "dummy-cart":
      import("../shared/environment-data-sources/dummy-adapter").then(({ default: load }): void => load());
      break;

    default:
      logger.warn("No event/environment specified, Only pageview is active");
      break;
  }
};
