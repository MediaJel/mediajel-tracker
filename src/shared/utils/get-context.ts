import { QueryStringContext, QueryStringParams } from '../types';

// Locates our tag

const getContext = (): QueryStringContext => {
  const scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName("script");
  const target: HTMLScriptElement = (document.currentScript as HTMLScriptElement) || scripts[scripts.length - 1];
  const substring: string = target.src.substring(target.src.indexOf("?"));
  const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
  const { mediajelAppId, appId, version, ...params } = Object.fromEntries(
    urlSearchParams.entries()
  ) as unknown as QueryStringParams;

  const storedVersion = localStorage.getItem("mj-tag-version");

  if (!storedVersion) {
    localStorage.setItem("mj-tag-version", version || "1");
  }

  // Store the version in local storage
  const resolvedVersion = storedVersion || localStorage.getItem("mj-tag-version");

  return {
    appId: appId || mediajelAppId, // Legacy support for old universal tag
    version: resolvedVersion, // tracker version
    collector: params.test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
    ...params,
  };
};

export default getContext;
