import { SnowplowTracker, SnowplowTrackerInput } from "/src/shared/types";

/**
 * @description  Creates a Snowplow tracker instance using the legacy sp.js
 * javascript tracker. Commonly known in the Snowplow docs as "v2". This is dynamically
 * imported to reduce the bundle size of the tag.
 *
 * @see {@link https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/javascript-tracker/javascript-tracker-v2/tracking-specific-events/}
 *
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 *
 */

const createLegacySnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { default: legacy } = await import("/src/snowplow/legacy");
  return legacy(input);
};

/**
 * @description  Creates a Snowplow tracker instance using the standard and supported cnna.js
 * javascript tracker. Commonly known in the Snowplow docs as "v3". This is dynamically imported
 * to reduce the bundle size of the tag.
 *
 * @see {@link https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/javascript-tracker/javascript-tracker-v3/tracking-events/}
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 * @see
 */

const createStandardSnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { default: standard } = await import("/src/snowplow/standard");
  return standard(input);
};

/**
 *  @description  Function factory that abstracts the version selection and
 *  returns the appropriate Snowplow tracker instance.
 *
 * @param {SnowplowTrackerInput} input  Input object for the Snowplow tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 */

const createSnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  switch (input.version) {
    case "1":
    case "legacy":
      return await createLegacySnowplowTracker(input);
    case "2":
    case "standard":
      return await createStandardSnowplowTracker(input);
    default:
      return await createLegacySnowplowTracker(input);
  }
};

export default createSnowplowTracker;
