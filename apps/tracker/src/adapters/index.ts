import logger from "@mediajel/tracker-core/logger";
import { createSnowplowTracker } from "@mediajel/tracker-core/snowplow";
import {
  applyExtensions,
  withSnowplowSegmentsExtension,
  withDeduplicationExtension,
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
  // dynamic chunk) and subscribed before the extensions array below is built —
  // the load:googleAds/load:bingAds catches notify while that array is still
  // evaluating, and a report fired before this subscription is dropped (the
  // observable has no replay). The raw tracker is enough here: no extension
  // wraps trackError.
  loadErrorAdapter(snowplow);

  // Apply extensions to the tracker
  const tracker = applyExtensions(snowplow, [
    withDeduplicationExtension,
    withEnsureBasketItemsOrderId,
    withRegisterThirdPartyTagsExtension,
    withSnowplowSegmentsExtension,
    /** Dynamically add Google Ads plugin/extension */
    plugins.includes("googleAds") &&
      (await import("@mediajel/tracker-core/snowplow/extensions")
        .then(({ withGoogleAdsExtension }) => withGoogleAdsExtension)
        // Degrade gracefully: report the failed plugin chunk and skip the
        // extension (falsy entries are filtered) instead of killing the tracker.
        .catch((error) => {
          notifyError(error, "load:googleAds");
          return false as const;
        })),
    /** Dynamically add Bing Ads plugin/extension */
    plugins.includes("bingAds") &&
      (await import("@mediajel/tracker-core/snowplow/extensions")
        .then(({ withBingAdsExtension }) => withBingAdsExtension)
        .catch((error) => {
          notifyError(error, "load:bingAds");
          return false as const;
        })),
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
