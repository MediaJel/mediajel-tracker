import logger from "@mediajel/tracker-core/logger";
import { SnowplowTracker } from "@mediajel/tracker-core/snowplow";
import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import observable from "@mediajel/tracker-core/utils/create-events-observable";

export default async (tracker: SnowplowTracker): Promise<void> => {
  const { context } = tracker;

  // We are subscribing to the observable to get the eccomerce events
  observable.subscribe(({ transactionEvent, addToCartEvent, removeFromCartEvent }) => {
    transactionEvent && tracker.ecommerce?.trackTransaction(transactionEvent);
    addToCartEvent && tracker.ecommerce?.trackAddToCart(addToCartEvent);
    removeFromCartEvent && tracker.ecommerce?.trackRemoveFromCart(removeFromCartEvent);
  });

  // We are dynamically loading the data source publisher/notifier based on the environment
  //* WARNING: Do not use absolute imports when dynamically loading modules

  if (!context.environment) {
    logger.warn("No event/environment specified, Only pageview is active");
    return;
  }

  const environments = context.environment
    .split(",")
    .map((env) => env.trim())
    .filter((env) => env.length > 0);

  for (const env of environments) {
    switch (env) {
      case "training":
        // Generic data source for the Integrations training site (dataLayer + fetch + postMessage).
        import("@mediajel/tracker-environments/environment-data-sources/training").then(({ default: load }): void => load(tracker)).catch((error) => notifyError(error, "load:training"));
        break;
      case "exercise":
        // Exercises feature (apps/integrations): exposes the raw data sources as globals so the
        // learner writes capture by hand. NO auto-capture — never notifies the observable above.
        import("@mediajel/tracker-environments/environment-data-sources/exercise").then(({ default: load }): void => load(tracker)).catch((error) => notifyError(error, "load:exercise"));
        // description: "exercise powers the apps/integrations Exercises feature (learner-written capture)"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }, { "value": "add_to_cart", "label": "Add to Cart" }, { "value": "remove_from_cart", "label": "Remove from Cart" }, { "value": "sign_up", "label": "Sign Up" }]
        break;
      case "bigcommerce":
        import("@mediajel/tracker-environments/environment-data-sources/bigcommerce").then(({ default: load }): void => load(tracker)).catch((error) => notifyError(error, "load:bigcommerce"));
        // description: "bigcommerce is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "blaze":
        import("@mediajel/tracker-environments/environment-data-sources/blaze").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:blaze"));
        // description: "blaze is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "buddi":
        import("@mediajel/tracker-environments/environment-data-sources/buddi").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:buddi"));
        // description: "buddi is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "dispense":
        import("@mediajel/tracker-environments/environment-data-sources/dispense").then(({ default: load }): void => load(tracker)).catch((error) => notifyError(error, "load:dispense"));
        // description: "dispense is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "drupal":
        import("@mediajel/tracker-environments/environment-data-sources/drupal").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:drupal"));
        // description: "drupal is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "dutchie-iframe":
        import("@mediajel/tracker-environments/environment-data-sources/dutchie-iframe").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:dutchie-iframe"));
        // description: "dutchie is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "dutchie-subdomain":
        import("@mediajel/tracker-environments/environment-data-sources/dutchie-subdomain").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:dutchie-subdomain"));
        // description: "dutchie is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "dutchieplus":
        import("@mediajel/tracker-environments/environment-data-sources/dutchie-plus").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:dutchie-plus"));
        // description: "dutchieplus is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "dutchie":
        import("@mediajel/tracker-environments/environment-data-sources/dutchie").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:dutchie"));
        // description: "dutchie is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "ecwid":
        import("@mediajel/tracker-environments/environment-data-sources/ecwid").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:ecwid"));
        // description: "ecwid is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "evenue":
        import("@mediajel/tracker-environments/environment-data-sources/evenue").then(({ default: load }): void => load(tracker)).catch((error) => notifyError(error, "load:evenue"));
        // description: "evenue is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "foxy":
        import("@mediajel/tracker-environments/environment-data-sources/foxy").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:foxy"));
        // description: "foxy is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "grassdoor":
        import("@mediajel/tracker-environments/environment-data-sources/grassdoor").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:grassdoor"));
        // description: "grassdoor is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "greenrush":
        import("@mediajel/tracker-environments/environment-data-sources/greenrush").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:greenrush"));
        // description: "greenrush is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "iqmetrix":
        import("@mediajel/tracker-environments/environment-data-sources/iqmetrix").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:iqmetrix"));
        // description: "iqmetrix is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "jane":
        import("@mediajel/tracker-environments/environment-data-sources/jane").then(({ default: load }): void => load(tracker)).catch((error) => notifyError(error, "load:jane"));
        // description: "jane is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "leafly":
        import("@mediajel/tracker-environments/environment-data-sources/leafly").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:leafly"));
        // description: "leafly is just a test descriptions"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "lightspeed":
        import("@mediajel/tracker-environments/environment-data-sources/lightspeed").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:lightspeed"));
        // description: "lightspeed is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "magento":
        import("@mediajel/tracker-environments/environment-data-sources/magento").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:magento"));
        // description: "magento is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "meadow":
        import("@mediajel/tracker-environments/environment-data-sources/meadow").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:meadow"));
        // description: "meadow is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "olla":
        import("@mediajel/tracker-environments/environment-data-sources/olla").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:olla"));
        // description: "olla is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "shopify":
        import("@mediajel/tracker-environments/environment-data-sources/shopify").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:shopify"));
        // description: "shopify is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "square":
        import("@mediajel/tracker-environments/environment-data-sources/square").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:square"));
        // description: "square is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "sticky-leaf":
        import("@mediajel/tracker-environments/environment-data-sources/sticky-leaf").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:sticky-leaf"));
        // description: "sticky-leaf is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "sweed":
        import("@mediajel/tracker-environments/environment-data-sources/sweed").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:sweed"));
        // description: "sweed is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "tymber":
        import("@mediajel/tracker-environments/environment-data-sources/tymber").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:tymber"));
        // description: "tymber is just a test description"
        // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }]
        break;
      case "ticketmaster":
        import("@mediajel/tracker-environments/environment-data-sources/ticketmaster").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:ticketmaster"));
        // description: "ticketmaster is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "ticketure":
        import("@mediajel/tracker-environments/environment-data-sources/ticketure").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:ticketure"));
        // description: "ticketure is just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
      case "tnew":
        import("@mediajel/tracker-environments/environment-data-sources/tnew").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:tnew"));
        // description: "tnew is a just a test description"
        // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
        break;
    case "weave":
      import("@mediajel/tracker-environments/environment-data-sources/weave").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:weave"));
      // description: "weave is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }, { "value": "basket_items", "label": "Basket Items" }]
      break;
    case "webjoint":
      import("@mediajel/tracker-environments/environment-data-sources/webjoint").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:webjoint"));
      // description: "webjoint is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }, { "value": "basket_items", "label": "Basket Items" }]
      break;
    case "wefunder":
      import("@mediajel/tracker-environments/environment-data-sources/wefunder").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:wefunder"));
      // description: "wefunder is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }, { "value": "basket_items", "label": "Basket Items" }]
      break;
    case "wix":
      import("@mediajel/tracker-environments/environment-data-sources/wix").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:wix"));
      // description: "wix is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }, { "value": "basket_items", "label": "Basket Items" }]
      break;
    case "woocommerce":
      import("@mediajel/tracker-environments/environment-data-sources/woocommerce").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:woocommerce"));
      // description: "woocommerce is a just a test description"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }, { "value": "basket_items", "label": "Basket Items" }]
      break;
    case "yotpo":
      import("@mediajel/tracker-environments/environment-data-sources/yotpo").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:yotpo"));
      // description: "yotpo is a just a test description"
      // events-tracked: [{ value: "add_to_cart", label: "Add to Cart" }, { value: "remove_from_cart", label: "Remove from Cart" }, { "value": "transaction", "label": "Transaction" }, { "value": "basket_items", "label": "Basket Items" }]
      break;
    case "flowhub":
      import("@mediajel/tracker-environments/environment-data-sources/flowhub").then(({ default: load }): void => load(tracker)).catch((error) => notifyError(error, "load:flowhub"));
      // description: "flowhub is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "thirdparty":
      import("@mediajel/tracker-environments/environment-data-sources/thirdparty").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:thirdparty"));
      // description: "thirdparty is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "carrot":
      import("@mediajel/tracker-environments/environment-data-sources/carrot").then(({ default: load }): void => load(tracker)).catch((error) => notifyError(error, "load:carrot"));
      // description: "carrot is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }, { "value": "basket_items", "label": "Basket Items" }]
      break;
    case "treez":
      import("@mediajel/tracker-environments/environment-data-sources/treez").then(({ default: load }): void => load()).catch((error) => notifyError(error, "load:treez"));
      // description: "treez is a just a test descriptions"
      // events-tracked: [{ "value": "transaction", "label": "Transaction" }]
      break;
    case "posabit":
      import("@mediajel/tracker-environments/environment-data-sources/posabit").then(({ default: load }): void => load());
      // description: "posabit is a just a test description"
      // events-tracked: [{ "value": "add_to_cart", "label": "Add to Cart" }, { "value": "transaction", "label": "Transaction" }]
      break;

      default:
        logger.warn("No event/environment specified, Only pageview is active");
        break;
    }
  }
};
