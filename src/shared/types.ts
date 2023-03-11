/**
 * @description General function to represent the snowplow tracker that gets imported
 * to the window
 */
export type SnowplowBrowserTracker = (...args: any[]) => void;

/**
 * @description The input for the snowplow function factories
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

export interface EnvironmentEvents {
  addToCartEvent: (cartData: CartEvent) => void;
  removeFromCartEvent: (cartData: CartEvent) => void;
  transactionEvent: (transactionData: TransactionEvent) => void;
}

// Data structure of the tag after parsing
export type TransactionParams = {
  environment: string;
  retailId: string;
};

export type SignupParams = {
  uuid: string;
  firstName: string;
  lastName: string;
  gender: string;
  emailAddress: string;
  hashedEmailAddress: string;
  address: string;
  city: string;
  state: string;
  phoneNumber: string;
  advertiser: string;
};

export type SnowplowParams = {
  appId?: string;
  mediajelAppId?: string;
  environment: string;
  event: "impression" | "transaction" | "signup";
  test: string;
  version: string;
};

export type SnowplowPluginParams = {
  debugger: string;
};

export type PluginParams = {
  plugin?: "googleAds" | "bingAds";
};

export type GoogleAdsPluginParams = {
  conversionId: string;
  conversionLabel: string;
  value?: number;
  currency?: string;
  transactionId?: string;
  crossDomainSites?: string; // Must be a comma separated string (I.E. "www.example.com,www.example2.com")
} & Pick<SnowplowParams, "environment">;

export type BingAdsPluginParams = {
  tagId: string;
} & Pick<SnowplowParams, "environment">;

export type ImpressionsMacrosParams = {
  advertiserId: string;
  insertionOrder: string;
  lineItemId: string;
  creativeId: string;
  publisherId: string;
  publisherName: string;
  siteId: string;
  siteName: string;
  liquidmAppId: string;
  appName: string;
  clickId: string;
  GAID: string;
  GAID_MD5: string;
  GAID_SHA1: string;
  IDFA: string;
  IDFA_MD5: string;
  IDFA_SHA1: string;
  DSPIDENTIFIER: string;
  DEVICEID: string;
  MAXMIND_CON_TYPE_NAME: string;
  MAXMIND_GEO_IDS: string;
  MAXMIND_ISP_ID: string;
};

export type LiquidmSegmentParams = {
  segmentId: string;
};

export type QueryStringParams = Partial<TransactionParams> &
  Partial<SignupParams> &
  Partial<SnowplowPluginParams> &
  Partial<ImpressionsMacrosParams> &
  Partial<PluginParams> &
  GoogleAdsPluginParams &
  BingAdsPluginParams &
  SnowplowParams &
  LiquidmSegmentParams;

// Params available to the tag's query string
export type QueryStringContext = QueryStringParams & { collector: string };
