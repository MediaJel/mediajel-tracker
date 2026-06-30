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

const loadAdapters = async (context: QueryStringContext): Promise<void> => {
  const plugins = context?.plugin?.split(",") || [];
  const data = "default"; // Test CI, remove this later
  logger.debug("Adapter Context", context);
  const snowplow = await createSnowplowTracker(context);

  // Apply extensions to the tracker
  const tracker = applyExtensions(snowplow, [
    withDeduplicationExtension,
    withEnsureBasketItemsOrderId,
    withRegisterThirdPartyTagsExtension,
    withSnowplowSegmentsExtension,
    /** Dynamically add Google Ads plugin/extension */
    plugins.includes("googleAds") &&
      (await import("@mediajel/tracker-core/snowplow/extensions").then(({ withGoogleAdsExtension }) => withGoogleAdsExtension)),
    /** Dynamically add Bing Ads plugin/extension */
    plugins.includes("bingAds") &&
      (await import("@mediajel/tracker-core/snowplow/extensions").then(({ withBingAdsExtension }) => withBingAdsExtension)),
  ]);

  window.trackTrans = tracker.ecommerce?.trackTransaction ?? (() => {});
  window.trackSignUp = tracker.trackSignup;
  window.addToCart = tracker.ecommerce?.trackAddToCart ?? (() => {});
  window.removeFromCart = tracker.ecommerce?.trackRemoveFromCart ?? (() => {});

  switch (context.event) {
    case "transaction":
      import("./ecommerce").then(({ default: load }): Promise<void> => load(tracker));
      break;
    case "impression":
      import("./impressions").then(({ default: load }): Promise<void> => load(tracker));
      break;
    case "signup":
      tracker.trackSignup(context);
      break;
    default:
      if (!context.environment) {
        logger.warn("No event/environment specified, Only pageview is active");
        return;
      }
      import("./ecommerce").then(({ default: load }): Promise<void> => load(tracker));
      logger.warn(`No event specified, Loading ${context.environment}`);
  }
};

export default loadAdapters;
