import getQueryString from "./helpers/utils/getQueryString";

const getContextObject = () => {
  const queryStringResult: any = getQueryString();
  const contextObject: any = {
    ...queryStringResult,
    appId: queryStringResult.appId ?? queryStringResult.mediajelAppId, // Legacy support for old universal tag
    version: queryStringResult.version ?? "latest",
    collector: queryStringResult.test
      ? process.env.MJ_STAGING_COLLECTOR_URL
      : process.env.MJ_PRODUCTION_COLLECTOR_URL,
    event: queryStringResult.event ?? "transaction",
  };
  
  // Delete useless key-value pair in contextObject
  delete contextObject.mediajelAppId && delete contextObject.test;

  return contextObject;
};

export default getContextObject;
