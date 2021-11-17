import { QueryStringParams } from "../get-tag/helpers/types";

// Data structure of the tag after parsing
export type TagContext = Omit<QueryStringParams, "mediajelAppId" | "test"> & {
  collector: string;
};
