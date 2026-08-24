import logger from "@mediajel/tracker-core/logger";
import { createSnowplowTracker } from "@mediajel/tracker-core/snowplow";
import {
  applyExtensions,
  withSnowplowSegmentsExtension,
  withDeduplicationExtension,
  withGoogleAdsExtension,
  withBingAdsExtension,
} from "@mediajel/tracker-core/snowplow/extensions";
import withEnsureBasketItemsOrderId from "@mediajel/tracker-core/snowplow/extensions/ensure-basket-items-order-id";
import withRegisterThirdPartyTagsExtension from "@mediajel/tracker-core/snowplow/extensions/register-third-party-tags";
import { QueryStringContext } from "@mediajel/tracker-core/types";
import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import loadErrorAdapter from "./error";

const loadAdapters = async (context: QueryStringContext): Promise<void> => {
  const plugins = context?.plugin?.split(",") || [];
  const data = "default"; // Test CI, remove this later
  logger.debug("Adapter Context", context);
  const snowplow = await createSnowplowTracker(context);

  // Always-on error capture, independent of context.event. Static import (not a
  // dynamic chunk), subscribed before anything downstream can notify — a report
  // fired before this subscription is dropped (the observable has no replay).
  // The raw tracker is enough here: no extension wraps trackError.
  loadErrorAdapter(snowplow);

  // Apply extensions to the tracker
  const tracker = applyExtensions(snowplow, [
    withDeduplicationExtension,
    withEnsureBasketItemsOrderId,
    withRegisterThirdPartyTagsExtension,
    withSnowplowSegmentsExtension,
    // Plugin-gated extensions. These were await import()s, but the same module
    // is statically imported above (and the barrel re-exports both), so the
    // dynamic specifier always resolved from the module registry — the .catch
    // reporters could never fire. Falsy entries are filtered by applyExtensions.
    plugins.includes("googleAds") && withGoogleAdsExtension,
    plugins.includes("bingAds") && withBingAdsExtension,
  ]);

  window.trackTrans = tracker.ecommerce?.trackTransaction ?? (() => {});
  window.trackSignUp = tracker.trackSignup;
  window.addToCart = tracker.ecommerce?.trackAddToCart ?? (() => {});
  window.removeFromCart = tracker.ecommerce?.trackRemoveFromCart ?? (() => {});

  switch (context.event) {
    case "transaction":
      import("./ecommerce")
        .then(({ default: load }): Promise<void> => load(tracker))
        .catch((error) => notifyError(error, "load:ecommerce"));
      break;
    case "impression":
      import("./impressions")
        .then(({ default: load }): Promise<void> => load(tracker))
        .catch((error) => notifyError(error, "load:impressions"));
      break;
    case "signup":
      tracker.trackSignup(context);
      break;
    default:
      if (!context.environment) {
        logger.warn("No event/environment specified, Only pageview is active");
        return;
      }
      import("./ecommerce")
        .then(({ default: load }): Promise<void> => load(tracker))
        .catch((error) => notifyError(error, "load:ecommerce"));
      logger.warn(`No event specified, Loading ${context.environment}`);
  }
};

export default loadAdapters;
