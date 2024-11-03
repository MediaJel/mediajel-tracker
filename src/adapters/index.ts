import { createSnowplowTracker } from "src/shared/snowplow";
import withSnowplowBingAdsExtension from "src/shared/snowplow-extensions.ts/bing-ads";
import withSnowplowGoogleAdsExtension from "src/shared/snowplow-extensions.ts/google-ads";
import withSnowplowSegmentsExtension from "src/shared/snowplow-extensions.ts/segments";

import { QueryStringContext } from "../shared/types";

const applyExtensions = (tracker: any, extensions: ((tracker: any) => any)[]): any => {
  return extensions.reduce((currentTracker, extension) => extension(currentTracker), tracker);
};

// TODO: Better function name?
const loadAdapters = async (context: QueryStringContext): Promise<void> => {
  const plugins = context.plugin.split(",");

  const tracker = applyExtensions(createSnowplowTracker(context), [
    withSnowplowSegmentsExtension,
    plugins.includes("googleAds") && withSnowplowGoogleAdsExtension,
    plugins.includes("bingAds") && withSnowplowBingAdsExtension,
  ]);

  switch (context.event) {
    case "transaction":
      import("./transaction").then(({ default: load }): Promise<void> => load(tracker));
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
      import("./transaction").then(({ default: load }): Promise<void> => load(tracker));
      console.warn(`No event specified, Loading ${context.environment}`);
  }
};

export default loadAdapters;
