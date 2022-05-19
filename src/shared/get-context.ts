import { QueryStringContext, QueryStringParams } from "../shared/types";

// Gets our tag
const getQueryString = (): QueryStringParams => {
    const scripts = document.getElementsByTagName('script');
    const target = document.currentScript as HTMLScriptElement || scripts[scripts.length - 1];
    const substring: string = target.src.substring(target.src.indexOf("?"));
    const params = new URLSearchParams(substring);
    return Object.fromEntries((params).entries()) as QueryStringParams;
}

// Creates the context object
const getContextObject = (): QueryStringContext => {
    const { appId, mediajelAppId, environment, event, test, version } = getQueryString();

    if (!appId && !mediajelAppId) throw new Error("appId is required");

    return {
        appId: appId || mediajelAppId, // Legacy support for old universal tag
        version: version || "v1",
        collector: test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
        event,
        environment
    };

};

export default getContextObject;