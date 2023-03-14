/**
 * General function to represent the snowplow tracker that gets imported
 * to the window
 */
export type SnowplowBrowserTracker = (...args: any[]) => void;

/**
 * The input for the snowplow function factories
 * @memberof Snowplow
 * @see {@link Snowplow.createSnowplowTracker createSnowplowTracker}
 */
export interface SnowplowTrackerInput {
  /**
   * The unique identifier for the client that is sending the event
   */
  appId: string;
  /**
   * A snowplow collector url
   */
  collector: string;
  /**
   * The event that the tracker
   */
  event: Event;
  /**
   * The environment template selected
   */
  environment: string;
  /**
   * The version of the tracker
   */
  version: string;
}

/**
 * The input for the snowplow <code>trackRecord</code> function
 *
 * @memberof Snowplow
 * @see {@link Snowplow.Legacy.record  Legacy tracker record event}
 * @see {@link Snowplow.Standard.record  Standard tracker record event}
 */
export interface TrackRecordInput {
  /**
   * The unique identifier for the client that is sending the event
   */
  appId: string;
  /**
   * The environment template selected
   */
  environment: string;
  /**
   * The version of the tracker
   */
  version: string;
}

/** Enumerated event types for the tracker */
export type Event = "impression" | "transaction" | "signup";

/**
 * Method interfaces that represents a snowplow tracker
 */
export interface SnowplowTracker {
  /**
   * Tracks a transaction event
   */
  trackTransaction: (transaction: TransactionEvent) => void;
  /**
   * Tracks an add to cart event
   */
  trackAddToCart: (item: CartEvent) => void;
  /**
   * Tracks a remove from cart event
   */
  trackRemoveFromCart: (item: CartEvent) => void;
  /**
   * Tracks a record event, mainly used to do internal analytics on already deployed trackers
   */
  trackRecord: (input: TrackRecordInput) => void;
}

/**
 * Represents the implementation of the `trackAddToCart` method from the `SnowplowTracker` interface
 * @memberof SnowplowTracker
 */
export type TrackAddToCart = Pick<SnowplowTracker, "trackAddToCart">;

/**
 * Represents the implementation of the `trackRemoveFromCart` method from the `SnowplowTracker` interface
 * @memberof SnowplowTracker
 */
export type TrackRemoveFromCart = Pick<SnowplowTracker, "trackRemoveFromCart">;

/**
 * Represents the implementation of the `trackTransaction` method of the `SnowplowTracker` interface
 * @memberof SnowplowTracker
 */
export type TrackTransaction = Pick<SnowplowTracker, "trackTransaction">;

/** */

/**
 * The input for the snowplow `init` function
 */
export interface SnowplowInitInput {
  /**
   * The unique identifier for the client that is sending the event
   */
  appId: string;
  /**
   * A snowplow collector url
   */
  collector: string;
  /**
   * The event that the tracker is configured for
   */
  event: string;
}

export interface CartEvent {
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
  currency: string;
  userId?: string;
}

export interface TransactionCartItem extends CartEvent {
  orderId: string;
}

export interface TransactionEvent {
  id: string;
  total: number;
  tax: number;
  shipping: number;
  city: string;
  state: string;
  country: string;
  currency: string;
  userId?: string;
  items: TransactionCartItem[];
}
