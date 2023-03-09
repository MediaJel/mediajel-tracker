import { SnowplowTrackerInput } from "/src/shared/types";

const createSnowplowTracker = () => {
  return {
    legacy: async (ctx: SnowplowTrackerInput) => {
      const { default: legacy } = await import("/src/snowplow/legacy");
      return legacy(ctx);
    },

    standard: async (ctx: SnowplowTrackerInput) => {
      const { default: standard } = await import("/src/snowplow/standard");
      return standard(ctx);
    },
  };
};

export default createSnowplowTracker;
