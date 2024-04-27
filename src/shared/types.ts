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
  event: "impression" | "transaction" | "signup" | "googleAds";
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
  dspAppId: string; // For other DSPs other than Liquid M
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
