import {
  CartEvent,
  SnowplowBrowserTracker,
  SnowplowTracker,
  SnowplowTrackerInput,
  TrackAddToCart,
  TrackRecordInput,
  TrackRemoveFromCart,
  TrackTransaction,
  TransactionEvent,
} from "/src/snowplow/common/types";
import init from "/src/snowplow/legacy/init";

/** @namespace Snowplow.Legacy */

/**
 * A curried function that returns a method to track an add to cart event with the Snowplow Legacy tracker
 *
 * @memberof Snowplow.Legacy
 * @name createSnowplowLegacyTracker#setupTrackAddToCart
 * @param {SnowplowBrowserTracker} tracker A Snowplow Legacy tracker
 * @returns {TrackAddToCart} A method that tracks an add to cart event with the Snowplow Legacy tracker
 */
const setupTrackAddToCart = (tracker: SnowplowBrowserTracker): TrackAddToCart => {
  return {
    trackAddToCart(item: CartEvent) {
      // TODO: Add setUserId implementation
      tracker("trackAddToCart", item.sku, item.name, item.category, item.unitPrice, item.quantity, item.currency);
    },
  };
};

/**
 * A curried function that returns a method to track a remove from cart event with the Snowplow Legacy tracker
 *
 * @memberof Snowplow.Legacy
 * @name createSnowplowLegacyTracker#setupTrackRemoveFromCart
 * @param {SnowplowBrowserTracker} tracker A Snowplow Legacy tracker
 * @returns {TrackRemoveFromCart} A method that tracks a remove from cart event with the Snowplow Legacy tracker
 */
const setupTrackRemoveFromCart = (tracker: SnowplowBrowserTracker): TrackRemoveFromCart => {
  return {
    trackRemoveFromCart(item: CartEvent) {
      // TODO: Add setUserId implementation
      tracker("trackRemoveFromCart", item.sku, item.name, item.category, item.unitPrice, item.quantity, item.currency);
    },
  };
};

/**
 * A curried function that returns a method to track a transaction event with the Snowplow Legacy tracker
 *
 * @memberof Snowplow.Legacy
 * @name createSnowplowLegacyTracker#setupTrackTransaction
 * @param {SnowplowBrowserTracker} tracker A Snowplow Legacy tracker
 * @returns {TrackTransaction} A method that tracks a transaction event with the Snowplow Legacy tracker
 */
const setupTrackTransaction = (tracker: SnowplowBrowserTracker): TrackTransaction => {
  return {
    trackTransaction(transaction: TransactionEvent) {
      // TODO: Add setUserId implementation
      tracker(
        "addTrans",
        transaction.id,
        "N/A",
        transaction.total,
        transaction.tax,
        transaction.shipping,
        transaction.city,
        transaction.state,
        transaction.country,
        transaction.currency
      );
      transaction.items.forEach((item) => {
        const { name, category, currency, orderId, quantity, sku, unitPrice } = item;
        tracker("addItem", orderId, sku, name, category, unitPrice, quantity, currency);
      });

      tracker("trackTrans");
    },
  };
};

/**
 * !TODO: Update Docs
 * Tracks a "record" event with the Snowplow Legacy tracker. This event is mainly used
 * for internal analytics (I.E. to monitor how many environments are being used, etc.)
 *
 * @memberof Snowplow.Legacy
 * @name record
 * @param {SnowplowBrowserTracker} tracker A Snowplow Legacy tracker
 * @param {TrackRecordInput} input Input for tracking a record event
 * @param {string} input.appId The application id
 * @param {string} input.environment The environment
 * @param {string} input.version The version
 * @returns {void} No return value
 */
const setupTrackRecord = (tracker: SnowplowBrowserTracker) => {
  return {
    trackRecord: (input: TrackRecordInput) => {
      const schema = {
        schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
        data: {
          appId: input.appId,
          cart: input.environment,
          version: input.version,
        },
      };

      tracker("trackSelfDescribingEvent", schema);
    },
  };
};

/**
 * @description Function factory that creates a Snowplow Legacy tracker instance.
 * The methods included in the tracker are specific to the Snowplow Legacy tracker
 * also known as "v2" in the snowplow docs
 *
 *  This function should not be called directly. Instead, use the {@link Snowplow.createSnowplowTracker createSnowplowTracker } function.
 * @class
 * @memberof Snowplow.Legacy
 * @see {@link https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/javascript-tracker/javascript-tracker-v2/tracking-specific-events/ Snowplow v2 documentation}
 * @param {SnowplowTrackerInput} input Input object for the Snowplow Legacy tracker
 * @param {string} input.appId The unique identifier for the client that is sending the event
 * @param {string} input.collector A snowplow collector url
 * @param {Event} input.event The event that the tracker is configured for
 * @param {string} input.environment The environment template selected
 * @param {string} input.version The version of the tracker
 * @returns {SnowplowTracker} Snowplow Legacy tracker
 *
 */
const createSnowplowLegacyTracker = (input: SnowplowTrackerInput): SnowplowTracker => {
  const tracker = init(input);
  return {
    ...setupTrackTransaction(tracker),
    ...setupTrackAddToCart(tracker),
    ...setupTrackRemoveFromCart(tracker),
    ...setupTrackRecord(tracker),
  };
};

export default createSnowplowLegacyTracker;
