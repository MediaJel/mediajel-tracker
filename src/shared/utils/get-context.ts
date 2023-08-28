import { QueryStringContext, QueryStringParams } from "../types";

// Locates our tag
const getContext = (): QueryStringContext => {
  const scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName("script");
  const target: HTMLScriptElement = (document.currentScript as HTMLScriptElement) || scripts[scripts.length - 1];
  const substring: string = target.src.substring(target.src.indexOf("?"));
  const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
  const { mediajelAppId, appId, version, ...params } = Object.fromEntries(
    urlSearchParams.entries()
  ) as unknown as QueryStringParams;

  return {
    appId: appId || mediajelAppId, // Legacy support for old universal tag
    version: version || "1",
    collector: params.test ? process.env.MJ_STAGING_COLLECTOR_URL : `collector-dojo-azsx401.dmp.cnna.io`,
    ...params,
  };
};

export default getContext;
