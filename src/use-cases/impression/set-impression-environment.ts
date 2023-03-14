import { QueryStringContext } from "/src/shared/types";
import { SnowplowTracker } from "/src/snowplow";

interface ImpressionEnvironmentInput {
  tracker: SnowplowTracker;
  ctx: QueryStringContext;
}

const setImpressionEnvironment = (input: ImpressionEnvironmentInput) => {
  const { ctx, tracker } = input;
};

export default setImpressionEnvironment;
