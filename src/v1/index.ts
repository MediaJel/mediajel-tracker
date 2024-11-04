import { S3 } from "aws-sdk";
import withSnowplowSegmentsExtension from "src/shared/extensions/segments";
import { createSegments, DstillerySegmentBuilderInput, NexxenSegmentBuilderInput } from "src/shared/segment-builder";
import { createSnowplowTracker } from "src/shared/snowplow";

import { QueryStringContext } from "../shared/types";
import createTracker from "./snowplow/events/create-tracker";
import recordIntegration from "./snowplow/events/record-integration";

const applyV1 = (context: QueryStringContext): void => {
  // createTracker(context);
  const tracker = withSnowplowSegmentsExtension(createSnowplowTracker(context));

  switch (context.event) {
    case "transaction":
      console.log("Removed");
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
      console.log("Removed");
      console.warn(`No event specified, Loading ${context.environment}`);
  }
};

export default applyV1;
