import logger from "src/shared/logger";
import { createSnowplowTracker } from "src/shared/snowplow";
import {
  applyExtensions,
  withSnowplowSegmentsExtension,
  withTransactionDeduplicationExtension,
} from "src/shared/snowplow/extensions";
import { QueryStringContext, ThirdPartyTags } from "src/shared/types";
import observable from "src/shared/utils/create-events-observable";

const loadAdapters = async (context: QueryStringContext): Promise<void> => {
  const plugins = context?.plugin?.split(",") || [];
  const snowplow = await createSnowplowTracker(context);

  // Apply extensions to the tracker
  const tracker = applyExtensions(snowplow, [
    withTransactionDeduplicationExtension,
    withSnowplowSegmentsExtension,
    /** Dynamically add Google Ads plugin/extension */
    plugins.includes("googleAds") &&
      (await import("src/shared/snowplow/extensions").then(({ withGoogleAdsExtension }) => withGoogleAdsExtension)),
    /** Dynamically add Bing Ads plugin/extension */
    plugins.includes("bingAds") &&
      (await import("src/shared/snowplow/extensions").then(({ withBingAdsExtension }) => withBingAdsExtension)),
  ]);

  window.trackTrans = tracker.ecommerce.trackTransaction;

  const registerThirdPartyTags = (events: {
    onTransaction?: ThirdPartyTags[];
    onAddToCart?: ThirdPartyTags[];
    onRemoveFromCart?: ThirdPartyTags[];
    onSignup?: ThirdPartyTags[];
  }) => {
    observable.notify(events);
  };
  
  (window as any).registerThirdPartyTags = registerThirdPartyTags;

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
