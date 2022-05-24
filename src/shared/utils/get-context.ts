import { QueryStringContext, QueryStringParams } from "../types";

// Locates our tag
const getContext = (): QueryStringContext => {
    const scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName('script');
    const target: HTMLScriptElement = document.currentScript as HTMLScriptElement || scripts[scripts.length - 1];
    const substring: string = target.src.substring(target.src.indexOf("?"));
    const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
    const { mediajelAppId, appId, version, event, environment, ...params } = Object.fromEntries((urlSearchParams).entries()) as QueryStringParams

    // Validations
    if (!appId && !mediajelAppId) throw new Error("appId is required");


    return {
        appId: appId || mediajelAppId, // Legacy support for old universal tag
        version: version || "1.0",
        collector: params.test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
        event: event || environment,
        environment,
        ...params
    };
}

export default getContext