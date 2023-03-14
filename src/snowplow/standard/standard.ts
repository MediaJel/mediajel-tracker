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
import init from "/src/snowplow/standard/init";

/** @namespace Snowplow.Standard */

/**
 * A curried function that returns a method to track adding items to a cart with the Snowplow Standard tracker
 *
 * @memberof Snowplow.Standard
 * @name createSnowplowStandardTracker#setupTrackAddToCart
 * @param {SnowplowBrowserTracker} tracker - The Snowplow tracker instance
 * @returns {TrackAddToCart} A method to track adding items to a cart
 */
const setupTrackAddToCart = (tracker: SnowplowBrowserTracker): TrackAddToCart => {
  return {
    trackAddToCart(item: CartEvent) {
      // TODO: Add setUserId implementation
      tracker("trackAddToCart", {
        sku: item.sku,
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        currency: item.currency,
      });
    },
  };
};

/**
 * A curried function that contains a method to track removing items from a cart with the Snowplow Standard tracker
 *
 * @memberof Snowplow.Standard
 * @name createSnowplowStandardTracker#setupTrackRemoveFromCart
 * @param {SnowplowBrowserTracker} tracker - The Snowplow tracker instance
 * @returns {TrackRemoveFromCart} A method to track removing items from a cart
 */
const setupTrackRemoveFromCart = (tracker: SnowplowBrowserTracker): TrackRemoveFromCart => {
  return {
    trackRemoveFromCart(item: CartEvent): void {
      // TODO: Add setUserId implementation
      tracker("trackRemoveFromCart", {
        sku: item.sku,
        name: item.name,
        category: item.category,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        currency: item.currency,
      });
    },
  };
};

/**
 * A curried function that returns a method to track a transaction event with the Snowplow Standard tracker
 *
 * @memberof Snowplow.Standard
 * @name createSnowplowStandardTracker#setupTrackTransaction
 * @param {SnowplowBrowserTracker} tracker Snowplow tracker instance
 * @returns {TrackTransaction} A method that tracks a transaction event
 */
const setupTrackTransaction = (tracker: SnowplowBrowserTracker): TrackTransaction => {
  return {
    trackTransaction(transaction: TransactionEvent): void {
      // TODO: Add setUserId implementation
      tracker("addTrans", {
        orderId: transaction.id,
        affiliation: "N/A",
        total: transaction.total,
        tax: transaction.tax,
        shipping: transaction.shipping,
        city: transaction.city,
        state: transaction.state,
        country: transaction.country,
        currency: transaction.currency,
      });

      transaction.items.forEach((item) => {
        tracker("addItem", {
          orderId: transaction.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.unitPrice,
          quantity: item.quantity,
          currency: item.currency,
        });
      });

      tracker("trackTrans");
    },
  };
};

/**
 * !TODO: Update Docs
 * Tracks a "record" event with the Snowplow Standard tracker. This event is mainly used
 * for internal analytics (I.E. to monitor how many environments are being used, etc.)
 *
 * @memberof Snowplow.Standard
 * @name record
 * @param {SnowplowBrowserTracker} tracker A Snowplow Standard tracker
 * @param {TrackRecordInput} input Input for tracking a record event
 * @param {string} input.appId The application id
 * @param {string} input.environment The environment
 * @param {string} input.version The version
 * @returns {void} No return value
 */
const setupTrackRecord = (tracker: SnowplowBrowserTracker) => {
  return {
    trackRecord: (input: TrackRecordInput) => {
      tracker("trackSelfDescribingEvent", {
        event: {
          schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
          data: {
            appId: input.appId,
            cart: input.environment,
            version: input.version,
          },
        },
      });
    },
  };
};

/**
 * Function factory that creates a Snowplow Standard tracker instance.
 * The methods included in the tracker are specific to the Snowplow Standard tracker
 * also known as "v3" in the snowplow docs.
 *
 * This function should not be called directly. Instead, use the {@link Snowplow.createSnowplowTracker createSnowplowTracker } function.
 *
 * @class
 * @memberof Snowplow.Standard
 * @example <caption> Creating a Snowplow Standard tracker </caption>
 * const tracker = createSnowplowStandardTracker({
 *   appId: "my-app",
 *   collector: "https://my-collector.com",
 *   event: "transaction",
 *   environment: "dutchie-iframe",
 *   version: "standard"
 * });,
 * @see {@link https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/javascript-tracker/javascript-tracker-v3/tracking-events/ Snowplow v3 documentation}
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @param {string} input.appId The unique identifier for the client that is sending the event
 * @param {string} input.collector A snowplow collector url
 * @param {Event} input.event The event that the tracker is configured for
 * @param {string} input.environment The environment template selected
 * @param {string} input.version The version of the tracker
 * @returns {SnowplowTracker} Snowplow tracker instance
 */
const createSnowplowStandardTracker = (input: SnowplowTrackerInput): SnowplowTracker => {
  const tracker = init(input);
  return {
    ...setupTrackTransaction(tracker),
    ...setupTrackAddToCart(tracker),
    ...setupTrackRemoveFromCart(tracker),
    ...setupTrackRecord(tracker),
  };
};

export default createSnowplowStandardTracker;
