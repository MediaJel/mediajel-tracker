import logger from "src/shared/logger";
import { SnowplowTracker } from "src/shared/snowplow";
import observable from "src/shared/utils/create-events-observable";

export default async (tracker: SnowplowTracker): Promise<void> => {
  const { context } = tracker;

  // We are subscribing to the observable to get the eccomerce events
  observable.subscribe(({ transactionEvent, addToCartEvent, removeFromCartEvent }) => {
    transactionEvent && tracker.ecommerce.trackTransaction(transactionEvent);
    addToCartEvent && tracker.ecommerce.trackAddToCart(addToCartEvent);
    removeFromCartEvent && tracker.ecommerce.trackRemoveFromCart(removeFromCartEvent);
  });

  // We are dynamically loading the data source publisher/notifier based on the environment(s)
  //* WARNING: Do not use absolute imports when dynamically loading modules
  
  // Handle multiple environments by iterating through each one
  const environments = Array.isArray(context.environment) 
    ? context.environment 
    : context.environment ? [context.environment] : [];

  if (environments.length === 0) {
    logger.warn("No event/environment specified, Only pageview is active");
    return;
  }

  for (const env of environments) {
    switch (env) {
      case "bigcommerce":
        import("../shared/environment-data-sources/bigcommerce").then(({ default: load }): void => load(tracker));
        break;
      case "blaze":
        import("../shared/environment-data-sources/blaze").then(({ default: load }): void => load());
        break;
      case "buddi":
        import("../shared/environment-data-sources/buddi").then(({ default: load }): void => load());
        break;
      case "dispense":
        import("../shared/environment-data-sources/dispense").then(({ default: load }): void => load(tracker));
        break;
      case "drupal":
        import("../shared/environment-data-sources/drupal").then(({ default: load }): void => load());
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
      case "dutchie":
        import("../shared/environment-data-sources/dutchie").then(({ default: load }): void => load());
        break;
      case "ecwid":
        import("../shared/environment-data-sources/ecwid").then(({ default: load }): void => load());
        break;
      case "foxy":
        import("../shared/environment-data-sources/foxy").then(({ default: load }): void => load());
        break;
      case "grassdoor":
        import("../shared/environment-data-sources/grassdoor").then(({ default: load }): void => load());
        break;
      case "greenrush":
        import("../shared/environment-data-sources/greenrush").then(({ default: load }): void => load());
        break;
      case "iqmetrix":
        import("../shared/environment-data-sources/iqmetrix").then(({ default: load }): void => load());
        break;
      case "jane":
        import("../shared/environment-data-sources/jane").then(({ default: load }): void => load(tracker));
        break;
      case "leafly":
        import("../shared/environment-data-sources/leafly").then(({ default: load }): void => load());
        break;
      case "lightspeed":
        import("../shared/environment-data-sources/lightspeed").then(({ default: load }): void => load());
        break;
      case "magento":
        import("../shared/environment-data-sources/magento").then(({ default: load }): void => load());
        break;
      case "meadow":
        import("../shared/environment-data-sources/meadow").then(({ default: load }): void => load());
        break;
      case "olla":
        import("../shared/environment-data-sources/olla").then(({ default: load }): void => load());
        break;
      case "shopify":
        import("../shared/environment-data-sources/shopify").then(({ default: load }): void => load());
        break;
      case "square":
        import("../shared/environment-data-sources/square").then(({ default: load }): void => load());
        break;
      case "sticky-leaf":
        import("../shared/environment-data-sources/sticky-leaf").then(({ default: load }): void => load());
        break;
      case "sweed":
        import("../shared/environment-data-sources/sweed").then(({ default: load }): void => load());
        break;
      case "tymber":
        import("../shared/environment-data-sources/tymber").then(({ default: load }): void => load());
        break;
      case "ticketmaster":
        import("../shared/environment-data-sources/ticketmaster").then(({ default: load }): void => load());
        break;
      case "ticketure":
        import("../shared/environment-data-sources/ticketure").then(({ default: load }): void => load());
        break;
      case "tnew":
        import("../shared/environment-data-sources/tnew").then(({ default: load }): void => load());
        break;
      case "weave":
        import("../shared/environment-data-sources/weave").then(({ default: load }): void => load());
        break;
      case "webjoint":
        import("../shared/environment-data-sources/webjoint").then(({ default: load }): void => load());
        break;
      case "wefunder":
        import("../shared/environment-data-sources/wefunder").then(({ default: load }): void => load());
        break;
      case "wix":
        import("../shared/environment-data-sources/wix").then(({ default: load }): void => load());
        break;
      case "woocommerce":
        import("../shared/environment-data-sources/woocommerce").then(({ default: load }): void => load());
        break;
      case "yotpo":
        import("../shared/environment-data-sources/yotpo").then(({ default: load }): void => load());
        break;
      case "flowhub":
        import("../shared/environment-data-sources/flowhub").then(({ default: load }): void => load(tracker));
        break;
      case "thirdparty":
        import("../shared/environment-data-sources/thirdparty").then(({ default: load }): void => load());
        break;
      case "carrot":
        import("../shared/environment-data-sources/carrot").then(({ default: load }): void => load(tracker));
        break;
      default:
        logger.warn(`Unknown environment specified: ${env}`);
        break;
    }
  }
};
