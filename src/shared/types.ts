// Params available to the tag's query string
export type QueryStringParams = {
  appId: string;
  version: string;
  collector: string;
  event: string;
  mediajelAppId: string;
  test: string;
};

// Data structure of the tag after parsing
export type Transactions = Omit<QueryStringParams, "mediajelAppId" | "test"> & {
  environment: string;
  retailId?: string;
};

export type Impressions = Omit<Transactions, "retailId">;

export type Signup = {
  uuid ?: string,
  firstName ?: string,
  lastName ?: string,
  gender ?: string,
  emailAddress ?: string,
  hashedEmailAddress ?: string,
  address ?: string,
  city ?: string,
  state ?: string,
  phoneNumber ?: string,
  advertiser ?: string
}
