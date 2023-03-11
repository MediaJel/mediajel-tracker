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
import init from "/src/snowplow/standard/init";

/** @namespace Snowplow.Standard */

/**
 * A curried function that returns a method to track adding items to a cart
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
 * A curried function that contains a method to track removing items from a cart
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
 * A curried function that returns a method to track a transaction event
 *
 * @memberof Snowplow.Standard
 * @name createSnowplowStandardTracker#setupTrackTransaction
 * @param {tracker} tracker Snowplow tracker instance
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

const record = (tracker: SnowplowBrowserTracker, input: SnowplowTrackerInput) => {
  const schema = {
    event: {
      schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2",
      data: {
        appId: input.appId,
        cart: input.environment,
        version: input.version,
      },
    },
  };

  tracker("trackSelfDescribingEvent", schema);
};

/**
 * Function factory that creates a Snowplow Standard tracker instance.
 * The methods included in the tracker are specific to the Snowplow Standard tracker
 * also known as "v3" in the snowplow docs
 *
 * @class
 * @memberof Snowplow.Standard
 * @see {@link https://docs.snowplow.io/docs/collecting-data/collecting-from-own-applications/javascript-trackers/javascript-tracker/javascript-tracker-v3/tracking-events/ Snowplow v3 documentation}
 * @param {SnowplowTrackerInput} input Input object for the Snowplow tracker
 * @param {SnowplowTrackerInput.appId} input.appId The unique identifier for the client that is sending the event
 * @param {SnowplowTrackerInput.collector} input.collector A snowplow collector url
 * @param {SnowplowTrackerInput.event} input.event The event that the tracker is configured for
 * @param {SnowplowTrackerInput.environment} input.environment The environment template selected
 * @param {SnowplowTrackerInput.version} input.version The version of the tracker
 * @returns {SnowplowTracker} Snowplow tracker instance
 */
const createSnowplowStandardTracker = (input: SnowplowTrackerInput): SnowplowTracker => {
  const tracker = init(input);
  record(tracker, input);
  return {
    ...setupTrackTransaction(tracker),
    ...setupTrackAddToCart(tracker),
    ...setupTrackRemoveFromCart(tracker),
  };
};

export default createSnowplowStandardTracker;
