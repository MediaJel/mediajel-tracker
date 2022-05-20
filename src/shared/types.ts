
// Data structure of the tag after parsing
export type TransactionParams = {
  environment: string;
  retailId: string;
};


export type SignupParams = {
  uuid: string,
  firstName: string,
  lastName: string,
  gender: string,
  emailAddress: string,
  hashedEmailAddress: string,
  address: string,
  city: string,
  state: string,
  phoneNumber: string,
  advertiser: string
}

export type SnowplowParams = {
  appId?: string
  mediajelAppId?: string
  environment: string
  event: string
  test: string
  version: string
}

export type QueryStringParams = Partial<TransactionParams> & Partial<SignupParams> & SnowplowParams

// Params available to the tag's query string
export type QueryStringContext = QueryStringParams & { collector: string; };






