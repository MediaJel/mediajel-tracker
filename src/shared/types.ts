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
  event: 'impression' | 'transaction' | 'signup'
  test: string;
  version: string;
};

export type SnowplowPluginParams = {
  debugger: string;
};

export type LiquidmMacrosParams = {
  advertiserId: string
  insertionOrder: string
  lineItemId: string
  creativeId: string
  publisherId: string
  publisherName: string
  siteId: string
  siteName: string
  liquidmAppId: string
  appName: string
  clickId: string
  clickUrl: string
  clickPixel: string
  clickThrough: string
  GAID: string
  GAID_MD5: string
  GAID_SHA1: string
  IDFA: string
  IDFA_MD5: string
  IDFA_SHA1: string
  DSPIDENTIFIER: string
  DEVICEID: string
}

export type AddOnsParams = {
  utmPersist: string
}

export type QueryStringParams = Partial<TransactionParams> &
  Partial<SignupParams> &
  Partial<SnowplowPluginParams> &
  Partial<LiquidmMacrosParams> &
  Partial<AddOnsParams> &
  SnowplowParams;

// Params available to the tag's query string
export type QueryStringContext = QueryStringParams & { collector: string };
