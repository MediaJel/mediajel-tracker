// Params available to the tag's query string
export type QueryStringParams = {
  appId: string;
  version: string;
  collector: string;
  event: string;
  mediajelAppId?: string;
  test?: string;
};

// Data structure of the tag after parsing
export type Transactions = Omit<QueryStringParams, "mediajelAppId" | "test" | "event"> & {
  environment: string;
  retailId?: string;
};

export type Impressions = Omit<Transactions, "retailId">;

export type SignUp = Omit<QueryStringParams, "mediajelAppId" | "test" | "event"> & {
  uuid ?: string,
  firstName ?: string,
  lastName ?: string,
  gender ?: string,
  emailAddress ?: string,
  address ?: string,
  city ?: string,
  state ?: string,
  phoneNumber ?: string,
  advertiser ?: string
}
