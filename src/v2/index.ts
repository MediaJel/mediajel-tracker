import createTracker from "./snowplow/events/create-tracker";
import recordIntegration from "./snowplow/events/record";

import { QueryStringContext } from "../shared/types";
import { debuggerPlugin } from "./snowplow/plugins";
import { tapadCookieSyncPixel } from "../shared/partners/tapad/cookie-sync-pixel";
import { tapadHashSyncPixel } from "../shared/partners/tapad/hash-sync-pixel";

const applyV2 = (context: QueryStringContext): void => {
  createTracker(context);
  recordIntegration(context);
  tapadCookieSyncPixel();
  tapadHashSyncPixel();

  /** For debugging in the console */
  context.debugger === "true" && debuggerPlugin();

  switch (context.event) {
    case "transaction":
      import("./imports/carts").then(({ default: load }): void => load(context));
      break;
    case "impression":
      import("./imports/impression").then(({ default: load }): Promise<void> => load(context));
      break;
    case "signup":
      import("./snowplow/events/signup").then(({ default: load }): void => load(context));
      break;
    default:
      if (!context.environment) {
        console.warn("No event/environment specified, Only pageview is active");
      }
      import("./imports/carts").then(({ default: load }): void => load(context));
      console.warn(`No event specified, Loading ${context.environment} }`);
  }
};

export default applyV2;
