import { createSegments, NexxenSegmentBuilderInput } from "src/shared/segment-builder";

import { QueryStringContext } from "../shared/types";
import createTracker from "./snowplow/events/create-tracker";
import recordIntegration from "./snowplow/events/record";
import { debuggerPlugin } from "./snowplow/plugins";

const applyV2 = (context: QueryStringContext): void => {
  createTracker(context);
  recordIntegration(context);

  const liquidm = context.segmentId || context.s1;

  //* If s2.pv or s2.tr is not present, use context.s2 as default
  //* mainly used for legacy purposes
  const nexxen: NexxenSegmentBuilderInput = {
    pageVisitorBeaconId: context["s2.pv"] || context["s2"],
    transactionBeaconId: context["s2.tr"] || context["s2"],
  };

  const segments = createSegments({
    //* Accept both segmentId and s1 for legacy purposes
    liquidm,
    nexxen,
  });

  //* Expose to window
  window.cnnaSegments = segments;

  liquidm && segments.liquidm.emit();
  nexxen && segments.nexxen.emit();

  /** For debugging in the console **/
  context.debugger === "true" && debuggerPlugin();

  switch (context.event) {
    case "transaction":
      import("./imports/carts").then(({ default: load }): void => load(context, segments));
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
        return;
      }
      import("./imports/carts").then(({ default: load }): void => load(context, segments));
      console.warn(`No event specified, Loading ${context.environment} }`);
  }
};

export default applyV2;
