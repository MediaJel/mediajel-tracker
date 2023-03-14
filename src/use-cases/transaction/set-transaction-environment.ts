import { QueryStringContext } from "/src/shared/types";
import { SnowplowTracker } from "/src/snowplow";

interface TransactionEnvironmentInput {
  tracker: SnowplowTracker;
  ctx: QueryStringContext;
}

const setTransactionEnvironment = (input: TransactionEnvironmentInput) => {
  const { ctx, tracker } = input;
};

export default setTransactionEnvironment;
