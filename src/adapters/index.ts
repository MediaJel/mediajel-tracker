import withSnowplowSegmentsExtension from "src/shared/extensions/segments";
import { createSnowplowTracker, SnowplowTracker } from "src/shared/snowplow";

import { QueryStringContext } from "../shared/types";

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
    plugins.includes("googleAds") && (await import("src/shared/extensions/google-ads").then(({ default: ext }) => ext)),
    plugins.includes("bingAds") && (await import("src/shared/extensions/bing-ads").then(({ default: ext }) => ext)),
  ]);

  switch (context.event) {
    case "transaction":
      import("./ecommerce").then(({ default: load }): Promise<void> => load(tracker));
      break;
    case "impression":
      // import("./imports/impression").then(({ default: load }): Promise<void> => load(context));
      break;
    case "signup":
      // import("./snowplow/events/signup").then(({ default: load }): void => load(context));
      break;
    default:
      if (!context.environment) {
        console.warn("No event/environment specified, Only pageview is active");
        return;
      }
      import("./ecommerce").then(({ default: load }): Promise<void> => load(tracker));
      console.warn(`No event specified, Loading ${context.environment}`);
  }
};

export default loadAdapters;
