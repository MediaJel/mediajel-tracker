import loadTracker from "./snowplow-events/load-tracker";
import { QueryStringContext } from "../shared/types";

const applyV1 = (context: QueryStringContext): void => {
  loadTracker(context);

  /**
   * If not event is provided, By default use environment.
   */
  if (!context.event && context.environment) {
    console.log("hello");
    import("./imports/carts").then(({ default: load }): Promise<void> => load(context));
  }

  switch (context.event) {
    case "transaction":
      import("./imports/carts").then(({ default: load }): Promise<void> => load(context));
      break;
    case "impression":
      import("./imports/impressions").then(({ default: load }): Promise<void> => load(context));
      break;
    case "signup":
      import("./snowplow-events/signup").then(({ default: load }): void => load(context));
      break;
    default:
      console.warn("No event specified, Only pageview is active");
  }
};

export default applyV1;
