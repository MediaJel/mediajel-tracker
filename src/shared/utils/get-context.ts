import { QueryStringContext, QueryStringParams } from "../types";

// Locates our tag

//* v2
//* v1

const getContext = (): QueryStringContext => {
  const scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName("script");
  const target: HTMLScriptElement = (document.currentScript as HTMLScriptElement) || scripts[scripts.length - 1];
  const substring: string = target.src.substring(target.src.indexOf("?"));
  const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
  const { mediajelAppId, appId, version, ...params } = Object.fromEntries(
    urlSearchParams.entries(),
  ) as unknown as QueryStringParams;

  const version1SdkUrl = "//dm2q9qfzyjfox.cloudfront.net/sp.js";
  const version2SdkUrl = "//mj-snowplow-static-js.s3.amazonaws.com/cnna.js";
  const sdkUrl = params.sdkUrl || (version === "1" ? version1SdkUrl : version2SdkUrl);
  console.log("Updated 9/10/25");

  return {
    appId: appId || mediajelAppId, // Legacy support for old universal tag
    version: version || "1", // tracker version
    collector: params.test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
    sdkUrl,
    // Regex mainly used to remove the "&amp;" and the '\\"' from the outerHTML
    tag: target.outerHTML.replace(/&amp;/g, "&").replace(/\\"/g, '"'),
    ...params,
  };
};

export default getContext;
