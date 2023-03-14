import { QueryStringContext } from "/src/shared/types";
import { SnowplowTracker } from "/src/snowplow";

interface SignupEnvironmentInput {
  tracker: SnowplowTracker;
  ctx: QueryStringContext;
}

const setSignupEnvironment = (input: SignupEnvironmentInput) => {
  const { ctx, tracker } = input;
};

export default setSignupEnvironment;
