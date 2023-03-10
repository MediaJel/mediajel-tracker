import { SnowplowTracker, SnowplowTrackerInput } from "/src/shared/types";

/**
 * @category Snowplow
 * @description  Imports the Snowplow tracker instance using the legacy
 * javascript tracker. This is dynamically imported to reduce the bundle size of the tag.
 *
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @param {SnowplowTrackerInput} input Input object for standard Snowplow
 * @param {SnowplowTrackerInput.appId} input.appId The unique identifier for the client that is sending the event
 * @param {SnowplowTrackerInput.collector} input.collector A snowplow collector url
 * @param {SnowplowTrackerInput.event} input.event The event that the tracker is configured for
 * @param {SnowplowTrackerInput.environment} input.environment The environment template selected
 * @param {SnowplowTrackerInput.version} input.version The version of the tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 *
 */
const importLegacySnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { default: legacy } = await import("/src/snowplow/legacy");
  return legacy(input);
};

/**
 * @category Snowplow
 * @description  Imports the Snowplow tracker instance using the standard and supported
 * javascript tracker. This is dynamically imported to reduce the bundle size of the tag.
 *
 * @param {SnowplowTrackerInput} input Input object for standard Snowplow
 * @param {SnowplowTrackerInput.appId} input.appId The unique identifier for the client that is sending the event
 * @param {SnowplowTrackerInput.collector} input.collector A snowplow collector url
 * @param {SnowplowTrackerInput.event} input.event The event that the tracker is configured for
 * @param {SnowplowTrackerInput.environment} input.environment The environment template selected
 * @param {SnowplowTrackerInput.version} input.version The version of the tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 *
 */
const importStandardSnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { default: standard } = await import("/src/snowplow/standard");
  return standard(input);
};

/**
 *  @category Snowplow
 *  @description  Function factory that abstracts the version selection and
 *  returns the appropriate Snowplow tracker instance.
 *
 *  @example <caption> Creating a snowplow tracker </caption>
 *    const tracker = await createSnowplowTracker({
 *    appId: "my-app-id",
 *    collector: "https://my-collector.com",
 *    event: "transaction",
 *    environment: "iheartjane",
 *    version: "standard",
 *  });
 *
 * @param {SnowplowTrackerInput} input  Input object for the Snowplow tracker
 * @param {SnowplowTrackerInput} input Input object for standard Snowplow
 * @param {SnowplowTrackerInput.appId} input.appId The unique identifier for the client that is sending the event
 * @param {SnowplowTrackerInput.collector} input.collector A snowplow collector url
 * @param {SnowplowTrackerInput.event} input.event The event that the tracker is configured for
 * @param {SnowplowTrackerInput.environment} input.environment The environment template selected
 * @param {SnowplowTrackerInput.version} input.version The version of the tracker
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
