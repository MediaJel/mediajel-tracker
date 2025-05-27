import { assign } from "cypress/types/lodash";
import logger from "src/shared/logger";
import { createSnowplowTracker } from "src/shared/snowplow";
import {
  applyExtensions,
  withSnowplowSegmentsExtension,
  withDeduplicationExtension,
} from "src/shared/snowplow/extensions";
import withEnsureBasketItemsOrderId from "src/shared/snowplow/extensions/ensure-basket-items-order-id";
import withRegisterThirdPartyTagsExtension from "src/shared/snowplow/extensions/register-third-party-tags";
import { TransactionEventVariation, QueryStringContext, TransactionEvent } from "src/shared/types";
import { assignGlobalTrackers } from "src/shared/utils/assignGlobalTrackers";

const loadAdapters = async (context: QueryStringContext): Promise<void> => {
  const plugins = context?.plugin?.split(",") || [];
  const snowplow = await createSnowplowTracker(context);

  // Apply extensions to the tracker
  const tracker = applyExtensions(snowplow, [
    withDeduplicationExtension,
    withEnsureBasketItemsOrderId,
    withRegisterThirdPartyTagsExtension,
    withSnowplowSegmentsExtension,
    /** Dynamically add Google Ads plugin/extension */
    plugins.includes("googleAds") &&
      (await import("src/shared/snowplow/extensions").then(({ withGoogleAdsExtension }) => withGoogleAdsExtension)),
    /** Dynamically add Bing Ads plugin/extension */
    plugins.includes("bingAds") &&
      (await import("src/shared/snowplow/extensions").then(({ withBingAdsExtension }) => withBingAdsExtension)),
  ]);

  assignGlobalTrackers(tracker);

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
