import logger from '@mediajel/tracker-core/logger';
import { CreateSnowplowTrackerInput, SnowplowTracker } from '@mediajel/tracker-core/snowplow/types';

// Dynamic imports keep the tag lean on client sites — only the tracker version actually used is
// downloaded. IMPORTANT: use the PACKAGE-SPECIFIER form (@mediajel/tracker-core/...), not a relative
// path. A relative import() inside a Bun-symlinked workspace package resolves to a different
// canonical path than the package-`exports` resolution, so Parcel registers the chunk under one
// module id and looks it up under another → the import resolves to `undefined`. The package
// specifier matches the static imports elsewhere, so resolution stays consistent and it code-splits.
const createSnowplowTracker = async (input: CreateSnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { appId, collector, event } = input;
  logger.info(`Creating Snowplow tracker for version ${input.version}`);
  const isLegacyTracker = input.version === "1";

  const { default: createTracker } = isLegacyTracker
    ? await import("@mediajel/tracker-core/snowplow/v1/tracker")
    : await import("@mediajel/tracker-core/snowplow/v2/tracker");

  const tracker = await createTracker(input);
  tracker.initialize({ appId, collector, event });
  tracker.record(input);

  return tracker;
};

export default createSnowplowTracker;
