import { QueryStringContext, QueryStringParams } from '../types';

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

  console.log("window.overrides:", window.overrides);
  console.log("JSON.parse(window.overrides):", JSON.parse(window.overrides));
  const overrides = window.overrides ? JSON.parse(window.overrides) : { "s3.pv": "00000", "s3.tr": "00000" }

  console.log("overrides:", overrides);

  // let storedVersion = localStorage.getItem("mj-tag-version");

  // logger.debug("Stored Version", storedVersion);

  // if (!storedVersion) {
  //   localStorage.setItem("mj-tag-version", version || "1");
  //   storedVersion = version || "1";

  //   logger.debug("Stored Version not found, setting version as: ", storedVersion);
  // }

  // // Store the version in local storage
  // const resolvedVersion = storedVersion;

  // logger.debug("Resolved Version", resolvedVersion);

  return {
    appId: appId || mediajelAppId, // Legacy support for old universal tag
    version: version || "1", // tracker version
    collector: params.test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
    // Regex mainly used to remove the "&amp;" and the '\\"' from the outerHTML
    tag: target.outerHTML.replace(/&amp;/g, "&").replace(/\\"/g, '"'),
    "s3.pv": window.overrides ? overrides["s3.pv"] : params["s3.pv"],
    "s3.tr": window.overrides ? overrides["s3.tr"] : params["s3.tr"],
    ...params,
  };
};

export default getContext;
