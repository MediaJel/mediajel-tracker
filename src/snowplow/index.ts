import { SnowplowTrackerInput } from "/src/shared/types";

const createSnowplowTracker = () => {
  return {
    legacy: (ctx: SnowplowTrackerInput) => {
      import("/src/snowplow/legacy").then(({ default: legacy }) => legacy(ctx));
    },
    standard: (ctx: SnowplowTrackerInput) => {
      import("/src/snowplow/standard").then(({ default: standard }) => standard(ctx));
    },
  };
};

export default createSnowplowTracker;
