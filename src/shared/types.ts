
export type QueryStringParams = {
  appId: string
  mediajelAppId: string
  environment: string
  event: string
  test: string
  version: string
  retailId: string
}


// Params available to the tag's query string
export type QueryStringContext = Omit<QueryStringParams, "test"> & {
  collector: string;
};

// Data structure of the tag after parsing
export type Transactions = Omit<QueryStringContext, "mediajelAppId" | "test"> & {
  environment: string;
  retailId?: string;
};

export type Impressions = Omit<Transactions, "retailId">;

export type Signup = {
  uuid?: string,
  firstName?: string,
  lastName?: string,
  gender?: string,
  emailAddress?: string,
  hashedEmailAddress?: string,
  address?: string,
  city?: string,
  state?: string,
  phoneNumber?: string,
  advertiser?: string
}
