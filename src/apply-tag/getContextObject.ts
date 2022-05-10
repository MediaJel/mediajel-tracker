import { QueryStringParams } from "../shared/types";
import { getQueryString } from "../shared/utils";

const getContextObject = () => {
  const queryStringResult: any = getQueryString();
  const contextObject: QueryStringParams = {
    ...queryStringResult,
    appId: queryStringResult.appId ?? queryStringResult.mediajelAppId, // Legacy support for old universal tag
    version: queryStringResult.version ?? "latest",
    collector: queryStringResult.test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
    event: queryStringResult.event ? queryStringResult.event : queryStringResult.environment ? "transaction" : "pageview",
  };
  
  // Delete useless key-value pair in contextObject
  delete contextObject.mediajelAppId && delete contextObject.test;

  return contextObject;
};

export default getContextObject;
