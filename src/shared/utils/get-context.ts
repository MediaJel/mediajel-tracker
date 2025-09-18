import { QueryStringContext, QueryStringParams } from '../types';

// Locates our tag

//* v2
//* v1

const getContext = (): QueryStringContext => {
  const scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName("script");
  const target: HTMLScriptElement = (document.currentScript as HTMLScriptElement) || scripts[scripts.length - 1];
  const substring: string = target.src.substring(target.src.indexOf("?"));
  const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
  const { mediajelAppId, appId, version, environment, ...params } = Object.fromEntries(
    urlSearchParams.entries(),
  ) as unknown as QueryStringParams;

  // Parse comma-separated environments into an array, handling both string and array inputs
  const parsedEnvironment = environment 
    ? Array.isArray(environment) 
      ? environment.filter(env => env && env.trim().length > 0)
      : environment.split(',').map(env => env.trim()).filter(env => env.length > 0)
    : undefined;

  return {
    appId: appId || mediajelAppId, // Legacy support for old universal tag
    version: version || "1", // tracker version
    environment: parsedEnvironment,
    collector: params.test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
    // Regex mainly used to remove the "&" and the '\\"' from the outerHTML
    tag: target.outerHTML.replace(/&/g, "&").replace(/\\"/g, '"'),
    ...params,
  };
};

export default getContext;
