import { SnowplowTracker, SnowplowTrackerInput } from "/src/snowplow/common/types";

/**@namespace Snowplow */

/**
 * @description  Imports the Snowplow tracker instance using the legacy
 * javascript tracker. This is dynamically imported to reduce the bundle size of the tag.
 *
 * @example <caption> Dynamically importing legacy snowplow tracker </caption>
 * const legacyTracker = await importLegacySnowplowTracker({
 *   appId: "my-app-id",
 *   collector: "https://my-collector.com",
 *   event: "transaction",
 *   environment: "iheartjane",
 *   version: "legacy",
 * });
 * @memberof Snowplow
 * @param {SnowplowTrackerInput} input Input object for standard Snowplow
 * @param {string} input.appId The unique identifier for the client that is sending the event
 * @param {string} input.collector A snowplow collector url
 * @param {Event} input.event The event that the tracker is configured for
 * @param {string} input.environment The environment template selected
 * @param {string} input.version The version of the tracker
 * @returns {Promise<SnowplowTracker>} Snowplow Legacy tracker instance
 *
 */
const importLegacySnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { default: legacy } = await import("./legacy/legacy");
  return legacy(input);
};

/**
 * Imports the Snowplow tracker instance using the standard and supported
 * javascript tracker. This is dynamically imported to reduce the bundle size of the tag.
 *
 * @example <caption> Dynamically import standard snowplow tracker </caption>
 * const standardTracker = await importStandardSnowplowTracker({
 *   appId: "my-app-id",
 *   collector: "https://my-collector.com",
 *   event: "transaction",
 *   environment: "iheartjane",
 *   version: "standard",
 * });
 *
 * @memberof Snowplow
 * @param {SnowplowTrackerInput} input Input object for standard Snowplow
 * @param {string} input.appId The unique identifier for the client that is sending the event
 * @param {string} input.collector A snowplow collector url
 * @param {Event} input.event The event that the tracker is configured for
 * @param {string} input.environment The environment template selected
 * @param {string} input.version The version of the tracker
 * @returns {Promise<SnowplowTracker>} Snowplow tracker
 *
 */
const importStandardSnowplowTracker = async (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const { default: standard } = await import("./standard/standard");
  return standard(input);
};

/**
 *  Function that abstracts the version selection and
 *  returns the appropriate Snowplow tracker instance.
 *
 *  @example <caption> Creating a snowplow tracker. The correct version is inferred from the "version" parameter passed in </caption>
 *  const tracker = await createSnowplowTracker({
 *    appId: "my-app-id",
 *    collector: "https://my-collector.com",
 *    event: "transaction",
 *    environment: "iheartjane",
 *    version: "standard",
 *  });
 *
 * @memberof Snowplow
 * @param {SnowplowTrackerInput} input Input object for standard Snowplow
 * @param {string} input.appId The unique identifier for the client that is sending the event
 * @param {string} input.collector A snowplow collector url
 * @param {Event} input.event The event that the tracker is configured for
 * @param {string} input.environment The environment template selected
 * @param {string} input.version The version of the tracker
 * @returns {Promise<SnowplowTracker>} Snowplow Standard tracker
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
