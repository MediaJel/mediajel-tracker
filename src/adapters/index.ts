import { createSnowplowTracker } from 'src/shared/snowplow';
import withSnowplowSegmentsExtension from 'src/shared/snowplow-extensions.ts/segments';

import { QueryStringContext } from '../shared/types';

// TODO: Better function name?
const loadAdapters = async (context: QueryStringContext): Promise<void> => {
  // createTracker(context);
  const tracker = withSnowplowSegmentsExtension(createSnowplowTracker(context));

  switch (context.event) {
    case "transaction":
      import("./transaction").then(({ default: load }): Promise<void> => load(tracker));
      break;
    case "impression":
      // import("./imports/impression").then(({ default: load }): Promise<void> => load(context));
      break;
    case "signup":
      // import("./snowplow/events/signup").then(({ default: load }): void => load(context));
      break;
    default:
      if (!context.environment) {
        console.warn("No event/environment specified, Only pageview is active");
        return;
      }
      import("./transaction").then(({ default: load }): Promise<void> => load(tracker));
      console.warn(`No event specified, Loading ${context.environment}`);
  }
};

export default loadAdapters;
