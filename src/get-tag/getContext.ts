import { URLSearchParams } from "url";
import { QueryStringParams } from "../shared/types";

const getContext = () => {
  const getQueryString: string = (document.currentScript as HTMLScriptElement).src.substring( (document.currentScript as HTMLScriptElement).src.indexOf("?") );
  const params: URLSearchParams = new URLSearchParams( getQueryString );
  const queryStringResult = Object.fromEntries((params as URLSearchParams).entries());

  // More efficient way to get queryStrings
  // const params = new Proxy (new URLSearchParams(querystring), {
  //   get: (searchParams, prop) => searchParams.get(prop as string),
  // })

  const contextObject: QueryStringParams = {
    ...queryStringResult,
    appId: queryStringResult.appId ?? queryStringResult.mediajelAppId,
    version: queryStringResult.version ?? "latest",
    collector: queryStringResult.test
      ? process.env.MJ_STAGING_COLLECTOR_URL
      : process.env.MJ_PRODUCTION_COLLECTOR_URL,
    event: queryStringResult.event ?? "transaction",
  };
  
  delete contextObject.mediajelAppId && delete contextObject.test;

  return contextObject;
};

export default getContext;
