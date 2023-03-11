import {
  CartEvent,
  SnowplowBrowserTracker,
  SnowplowTracker,
  SnowplowTrackerInput,
  TrackAddToCart,
  TrackRemoveFromCart,
  TrackTransaction,
  TransactionEvent,
} from "/src/shared/types";
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

const record = (tracker: SnowplowBrowserTracker, input: SnowplowTrackerInput) => {
  const schema = {
    schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
    data: {
      appId: input.appId,
      cart: input.environment,
      version: input.version,
    },
  };

  tracker("trackSelfDescribingEvent", schema);
};

/**
 * @description Function factory that creates a Snowplow Legacy tracker instance.
 * The methods included in the tracker are specific to the Snowplow Legacy tracker
 * also known as "v2" in the snowplow docs
 *
 * @class
 * @memberof Snowplow.Legacy
 * @see {@link https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/javascript-tracker/javascript-tracker-v2/tracking-specific-events/ Snowplow v2 documentation}
 * @param {SnowplowTrackerInput} input Input object for the Snowplow Legacy tracker
 * @param {SnowplowTrackerInput.appId} input.appId The unique identifier for the client that is sending the event
 * @param {SnowplowTrackerInput.collector} input.collector A snowplow collector url
 * @param {SnowplowTrackerInput.event} input.event The event that the tracker is configured for
 * @param {SnowplowTrackerInput.environment} input.environment The environment template selected
 * @param {SnowplowTrackerInput.version} input.version The version of the tracker
 * @returns {SnowplowTracker} Snowplow Legacy tracker
 *
 */
const createSnowplowLegacyTracker = (input: SnowplowTrackerInput): SnowplowTracker => {
  const tracker = init(input);
  record(tracker, input);
  return {
    ...setupTrackTransaction(tracker),
    ...setupTrackAddToCart(tracker),
    ...setupTrackRemoveFromCart(tracker),
  };
};

export default createSnowplowLegacyTracker;
