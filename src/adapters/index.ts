import logger from 'src/shared/logger';
import { createSnowplowTracker, SnowplowTracker } from 'src/shared/snowplow';
import withSnowplowSegmentsExtension from 'src/shared/snowplow/extensions/segments';

import { QueryStringContext } from '../shared/types';

const applyExtensions = (
  tracker: SnowplowTracker,
  extensions: ((tracker: SnowplowTracker) => SnowplowTracker)[]
): SnowplowTracker => {
  return extensions.reduce((currentTracker, extension) => extension(currentTracker), tracker);
};

const loadAdapters = async (context: QueryStringContext): Promise<void> => {
  const plugins = context.plugin.split(",");
  const snowplow = await createSnowplowTracker(context);

  // Apply extensions to the tracker
  const tracker = applyExtensions(snowplow, [
    withSnowplowSegmentsExtension,
    /** Dynamically add Google Ads plugin/extension */
    plugins.includes("googleAds") && (await import("src/shared/snowplow/extensions/google-ads").then(({ default: ext }) => ext)),
    /** Dynamically add Bing Ads plugin/extension */
    plugins.includes("bingAds") && (await import("src/shared/snowplow/extensions/bing-ads").then(({ default: ext }) => ext)),
  ]);

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
