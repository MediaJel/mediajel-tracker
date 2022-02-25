import { URLSearchParams } from "url";
import { QueryStringParams } from "./helpers/types";

const getContext = () => {
  const getQueryString = (document.currentScript as HTMLScriptElement).src.substring( (document.currentScript as HTMLScriptElement).src.indexOf("?") );
  const params = new URLSearchParams( getQueryString );
  const queryStringResult = Object.fromEntries((params as URLSearchParams).entries());

  // More efficient way to get queryStrings
  // const params = new Proxy (new URLSearchParams(querystring), {
  //   get: (searchParams, prop) => searchParams.get(prop as string),
  // })

  const contextObject = {
    ...queryStringResult,
    appId: queryStringResult.appId ?? queryStringResult.mediajelAppId,
    version: queryStringResult.version ?? "latest",
    collector: queryStringResult.test
      ? process.env.MJ_STAGING_COLLECTOR_URL
      : process.env.MJ_PRODUCTION_COLLECTOR_URL,
  };
  
  delete (contextObject as QueryStringParams).mediajelAppId && delete (contextObject as QueryStringParams).test;

  return contextObject;
};

export default getContext;
