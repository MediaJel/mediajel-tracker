import { QueryStringContext, SnowplowTracker } from "/src/shared/types";

interface UseCaseInput {
  tracker: SnowplowTracker;
  ctx: QueryStringContext;
}
const setUseCase = (input: UseCaseInput) => {
  const { tracker, ctx } = input;
  //   switch (ctx.event) {
  //     case "transaction":
  //       import("./imports/carts").then(({ default: load }): Promise<void> => load({ tracker, ctx }));
  //       break;
  //     case "impression":
  //       import("./imports/impression").then(({ default: load }): Promise<void> => load({ tracker, ctx }));
  //       break;
  //     case "signup":
  //       import("./snowplow/events/signup").then(({ default: load }): void => load({ tracker, ctx }));
  //       break;
  //     default:
  //       if (!ctx.environment) {
  //         console.warn("No event/environment specified, Only pageview is active");
  //         return;
  //       }
  //       import("./imports/carts").then(({ default: load }): Promise<void> => load({ tracker, ctx }));
  //       console.warn(`No event specified, Loading ${ctx.environment}`);
  //   }
};

export default setUseCase;
