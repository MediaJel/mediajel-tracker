import { CreateSnowplowTrackerInput } from 'src/shared/snowplow/types';

const createSnowplowV1TrackerImpressionEventsHandlers = (input: CreateSnowplowTrackerInput) => {
  return {
    trackLiquidmImpression: () => {},
    trackMantisImpression: () => {},
  };
};

export default createSnowplowV1TrackerImpressionEventsHandlers;
