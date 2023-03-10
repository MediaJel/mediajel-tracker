import { SnowplowTracker, SnowplowTrackerInput } from "/src/shared/types";

/**
 * @description  Creates a Snowplow tracker instance using the legacy
 * javascript tracker. This is dynamically imported to reduce the bundle size of the tag.
 *
 * @see {@link createLegacySnowplowTracker}
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
 * @description  Creates a Snowplow tracker instance using the standard and supported
 * javascript tracker. This is dynamically imported to reduce the bundle size of the tag.
 *
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 *
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
 *
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
