import { SnowplowTracker, SnowplowTrackerInput } from "/src/shared/types";
import createSnowplowLegacySnowplowTracker from "/src/snowplow/legacy";

/**
 * @description  Imports the Snowplow tracker instance using the legacy
 * javascript tracker. This is dynamically imported to reduce the bundle size of the tag.
 *
 * @see {@link createSnowplowLegacySnowplowTracker}
 *
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 *
 */
const importLegacySnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { default: legacy } = await import("/src/snowplow/legacy");
  return legacy(input);
};

/**
 * @description  Imports the Snowplow tracker instance using the standard and supported
 * javascript tracker. This is dynamically imported to reduce the bundle size of the tag.
 *
 * @see {@link createStandardSnowplowTracker}
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 *
 */
const importStandardSnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { default: standard } = await import("/src/snowplow/standard");
  return standard(input);
};

/**
 *  @description  Function factory that abstracts the version selection and
 *  returns the appropriate Snowplow tracker instance.
 *
 * @param {SnowplowTrackerInput} input  Input object for the Snowplow tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 *
 */
const createSnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  switch (input.version) {
    case "1":
    case "legacy":
      return await importLegacySnowplowTracker(input);
    case "2":
    case "standard":
      return await importStandardSnowplowTracker(input);
    default:
      return await importLegacySnowplowTracker(input);
  }
};

export default createSnowplowTracker;
