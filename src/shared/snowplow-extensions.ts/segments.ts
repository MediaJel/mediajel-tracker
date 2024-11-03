import { SnowplowTracker } from "src/shared/snowplow/types";

const withSnowplowSegmentsExtension = (snowplow: SnowplowTracker) => {
  return {
    ...(snowplow.ecommerce.trackTransaction = (input) => {
      snowplow.ecommerce.trackTransaction(input);

      console.log("Hook");
    }),
  };
};

export default withSnowplowSegmentsExtension;
