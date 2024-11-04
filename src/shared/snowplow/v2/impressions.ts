import { CreateSnowplowTrackerInput } from 'src/shared/snowplow/types';

const createSnowplowV2TrackerImpressionEventsHandlers = (input: CreateSnowplowTrackerInput) => {
  return {
    trackLiquidmImpression: () => {},
    trackMantisImpression: () => {},
  };
};

export default createSnowplowV2TrackerImpressionEventsHandlers;
