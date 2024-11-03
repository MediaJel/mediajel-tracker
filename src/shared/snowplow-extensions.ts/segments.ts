import { SnowplowTracker } from "src/shared/snowplow/types";

const withSnowplowSegmentsExtension = (snowplow: SnowplowTracker) => {
  const trackTransaction = snowplow.ecommerce.trackTransaction;

  //* Overwrite the trackTransaction method
  snowplow.ecommerce.trackTransaction = (input) => {
    trackTransaction(input);
    console.log("Hook");
  };
  return snowplow;
};

export default withSnowplowSegmentsExtension;
