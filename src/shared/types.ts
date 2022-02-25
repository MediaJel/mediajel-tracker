import { QueryStringParams } from "../get-tag/helpers/types";

// Data structure of the tag after parsing
export type TagContext = Omit<QueryStringParams, "mediajelAppId" | "test"> & {
  collector: string;
};

export type SignUp = TagContext & {
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
