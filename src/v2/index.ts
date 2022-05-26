import createTracker from "./snowplow/create-tracker";
import { QueryStringContext } from "../shared/types";
import { debuggerPlugin } from "./snowplow/plugins";
import { liquidMRetargetingPixel } from "./partners/liquidm/retargeting-pixel";
import { tapadCookieSyncPixel } from "./partners/tapad/cookie-sync-pixel";
import { tapadHashSyncPixel } from "./partners/tapad/hash-sync-pixel";

const applyV2 = (context: QueryStringContext): void => {
  createTracker(context); // Creates the tracker with the configuration
  liquidMRetargetingPixel(); // Calls the LiquidM retargeting pixel
  tapadCookieSyncPixel(); // Calls the Tapad cookie sync pixel
  tapadHashSyncPixel(); // Calls the Tapad hash sync pixel

  console.log({ context });
  // For debugging
  if (context.test === "true") {
    debuggerPlugin();
  }

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
