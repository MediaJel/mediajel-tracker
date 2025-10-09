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

  affiliateId?: string;
  total: number;
  tax: number;
  shipping: number;
  city: string;
  state: string;
  country: string;
  currency: string;
  userId?: string;
  discount?: number;
  couponCode?: string;
  alternativeTransactionIds?: string[];
  items: TransactionCartItem[];
}

export interface EnvironmentEvents {
  addToCartEvent: (cartData: CartEvent) => void;
  removeFromCartEvent: (cartData: CartEvent) => void;
  transactionEvent: (transactionData: TransactionEvent) => void;
}

export interface EventsObservableEvents {
  transactionEvent: TransactionEvent;
  addToCartEvent: CartEvent;
  removeFromCartEvent: CartEvent;
}

export interface ThirdPartyTags {
  type: "image" | "script";
  tag: string;
}

export interface RegisterThirdPartyTagsInput {
  onTransaction?: ThirdPartyTags[];
  onAddToCart?: ThirdPartyTags[];
  onRemoveFromCart?: ThirdPartyTags[];
  onSignup?: ThirdPartyTags[];
}

// Data structure of the tag after parsing
export type TransactionParams = {
  environment: string | string[];
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

export interface retailIdentifier {
  id: {
    /**
     * The name of the retail identifier, used to create a URL parameter.
     */
    retailId: string;
    /**
     * An array of CSS selectors or element IDs to poll for the retail identifier.
     * These elements should be present on the page to ensure the retail ID is applied correctly.
     */
    element: string[];
    fn?: () => void;
  }[];
}

export type SnowplowParams = {
  appId: string;
  mediajelAppId?: string;
  environment: string | string[];
  event: "impression" | "transaction" | "signup" | "googleAds";
  test: string;
  version: string;
  tag: string;
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
  advertiserName: string;
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
  s1: string;
  segmentId: string;
};

export type NexxenSegmentParams = {
  //* Parameter used for identifying the nexxen beacon for visitor tracking & conversion tracking (Legacy)
  s2: string;
  // * Parameter used for identifyin the nexxen beacon for visitor tracking
  "s2.pv": string;
  // * Parameter used for identifying the nexxen beacon for conversion tracking
  "s2.tr": string;
};

export type DstillerySegmentParams = {
  // Site Visitor NC
  "s3.pv": string;
  // Purchase NC
  "s3.tr": string;
};

export type SegmentParams = LiquidmSegmentParams & NexxenSegmentParams & DstillerySegmentParams;

export type DatasourceTrackerParam = {
  debug: string;
};

export type enableTagParam = {
  enable: "true" | "false";
};

export type QueryStringParams = Partial<TransactionParams> &
  Partial<SignupParams> &
  Partial<SnowplowPluginParams> &
  Partial<ImpressionsMacrosParams> &
  Partial<PluginParams> &
  GoogleAdsPluginParams &
  BingAdsPluginParams &
  SnowplowParams &
  SegmentParams &
  DatasourceTrackerParam &
  enableTagParam;
  DatasourceTrackerParam & { sdkUrl: string };

// Params available to the tag's query string
export type QueryStringContext = QueryStringParams & { collector: string };
export interface Window {
  trackTrans: (input: TransactionEvent) => void;
  overrides?: {
    [key: string]: any;
    default?: any;
  };
}
