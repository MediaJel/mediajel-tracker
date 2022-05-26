import createTracker from "./snowplow/events/create-tracker";
import { QueryStringContext } from "../shared/types";
import { debuggerPlugin } from "./snowplow/plugins";
import { liquidMRetargetingPixel } from "./partners/liquidm/retargeting-pixel";
import { tapadCookieSyncPixel } from "./partners/tapad/cookie-sync-pixel";
import { tapadHashSyncPixel } from "./partners/tapad/hash-sync-pixel";
import recordIntegration from "./snowplow/events/record";

const applyV2 = (context: QueryStringContext): void => {
  createTracker(context);
  recordIntegration(context);
  liquidMRetargetingPixel();
  tapadCookieSyncPixel();
  tapadHashSyncPixel();

  // For debugging in the console
  debuggerPlugin();

  /**
   * If not event is provided, By default use environment.
   */
  if (!context.event && context.environment) {
    import("./imports/carts").then(({ default: load }): void => load(context));
  }

  switch (context.event) {
    case "transaction":
      import("./imports/carts").then(({ default: load }): void => load(context));
      break;
    default:
      console.warn("No event specified, Only pageview is active");
  }
};

export default applyV2;
