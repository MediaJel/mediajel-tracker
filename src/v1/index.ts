import createTracker from "./snowplow/events/create-tracker";
import recordIntegration from "./snowplow/events/record-integration";

import { liquidMRetargetingPixel } from "../shared/partners/liquidm/retargeting-pixel";
import { tapadCookieSyncPixel } from "../shared/partners/tapad/cookie-sync-pixel";
import { tapadHashSyncPixel } from "../shared/partners/tapad/hash-sync-pixel";
import { QueryStringContext } from "../shared/types";

const applyV1 = (context: QueryStringContext): void => {
  createTracker(context);
  recordIntegration(context);
  liquidMRetargetingPixel();
  tapadCookieSyncPixel();
  tapadHashSyncPixel();

  /**
   * If no event is provided, By default import carts.
   */
  if (!context.event && context.environment) {
    import("./imports/carts").then(({ default: load }): Promise<void> => load(context));
  }

  switch (context.event) {
    case "transaction":
      import("./imports/carts").then(({ default: load }): Promise<void> => load(context));
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

export default applyV1;
