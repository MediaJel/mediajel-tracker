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

  /**
   * If no event is provided, By default import carts.
   */
  if (!context.event && context.environment) {
    import("./imports/carts").then(({ default: load }): void => load(context));
  }

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
      console.warn("No event specified, Only pageview is active");
  }
};

export default applyV2;
