import createTracker from "./snowplow/events/create-tracker";
import recordIntegration from "./snowplow/events/record-integration";

import { QueryStringContext } from "../shared/types";

import { createSegments } from "src/shared/segment-builder";

const applyV1 = (context: QueryStringContext): void => {
  createTracker(context);
  recordIntegration(context);

  const liquidm = context.segmentId || context.s1;
  const nexxen = context.s2;

  const segments = createSegments({
    //* Accept both segmentId and s1 for legacy purposes
    liquidm,
    nexxen,
  });
  
  //* Expose to window
  window.segments = segments;

  liquidm && segments.liquidm.emit();
  nexxen && segments.nexxen.emit();

  switch (context.event) {
    case "transaction":
      import("./imports/carts").then(({ default: load }): Promise<void> => load(context, segments));
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
      import("./imports/carts").then(({ default: load }): Promise<void> => load(context, segments));
      console.warn(`No event specified, Loading ${context.environment}`);
  }
};

export default applyV1;
