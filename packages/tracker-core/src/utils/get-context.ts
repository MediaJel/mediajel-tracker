import { QueryStringContext, QueryStringParams } from "../types";

// Locates our tag

//* v2
//* v1

/**
 * Where this build sends events.
 *
 * Parcel inlines all three names at build time. The monorepo introduced COLLECTOR_URL; the CircleCI
 * contexts that actually exist still hold the two the pre-monorepo tag used, and the live tag at
 * tags.cnna.io is built from them. Reading COLLECTOR_URL alone would therefore have shipped a tag
 * with an empty collector to every client site — it loads, throws nothing, and posts to
 * `http://analytics/track`, because the Snowplow SDK reads an empty endpoint as the host.
 *
 * So: COLLECTOR_URL when a build supplies one, otherwise exactly what `main` does today.
 *
 * `params.test ? staging : production` is main's rule reproduced as-is, quirk included — ANY
 * non-empty value picks staging, `test=false` among them. That is what production does now, so
 * changing it here would be a behaviour change smuggled into a merge. Worth fixing on its own.
 *
 * A value stored without a scheme is normalised to protocol-relative. The tag posts to
 * `<collector>/analytics/track`, so a bare host would otherwise build a RELATIVE url and the events
 * would go to whatever site the tag is on.
 */
const resolveCollector = (params: { test?: string }): string => {
  const configured =
    process.env.COLLECTOR_URL ||
    (params.test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL) ||
    "";
  const trimmed = configured.trim();
  if (!trimmed) return "";
  return /^(https?:)?\/\//.test(trimmed) ? trimmed : `//${trimmed}`;
};

const getContext = (): QueryStringContext => {
  const scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName("script");
  const target: HTMLScriptElement = (document.currentScript as HTMLScriptElement) || scripts[scripts.length - 1];
  const substring: string = target.src.substring(target.src.indexOf("?"));
  const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
  const { mediajelAppId, appId, version, ...params } = Object.fromEntries(
    urlSearchParams.entries(),
  ) as unknown as QueryStringParams;

  return {
    ...params,
    appId: appId || mediajelAppId || "", // Legacy support for old universal tag
    version: version || "1", // tracker version
    environment: params.environment || "production",
    collector: resolveCollector(params),
    // Regex mainly used to remove the "&amp;" and the '\\"' from the outerHTML
    tag: target.outerHTML.replace(/&amp;/g, "&").replace(/\\"/g, '"'),
  };
};

export default getContext;
