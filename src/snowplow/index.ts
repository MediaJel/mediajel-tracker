import { SnowplowTrackerInput } from "/src/shared/types";

const createLegacySnowplowTracker = (input: SnowplowTrackerInput) => {
  return {
    legacy: async () => {
      const { default: legacy } = await import("/src/snowplow/legacy");
      return legacy(input);
    },
  };
};

const createStandardSnowplowTracker = (input: SnowplowTrackerInput) => {
  return {
    standard: async () => {
      const { default: standard } = await import("/src/snowplow/standard");
      return standard(input);
    },
  };
};

const createSnowplowTracker = (input: SnowplowTrackerInput) => {
  return {
    ...createLegacySnowplowTracker(input),
    ...createStandardSnowplowTracker(input),
  };
};

export default createSnowplowTracker;
