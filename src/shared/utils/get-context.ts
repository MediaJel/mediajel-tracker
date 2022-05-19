import { QueryStringContext, QueryStringParams } from "../types";

// Locates our tag
const getContext = (): QueryStringContext => {
    const scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName('script');
    const target: HTMLScriptElement = document.currentScript as HTMLScriptElement || scripts[scripts.length - 1];
    const substring: string = target.src.substring(target.src.indexOf("?"));
    const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
    const { environment, event, test, appId, mediajelAppId, version, retailId } = Object.fromEntries((urlSearchParams).entries()) as Partial<QueryStringParams>;

    // Validations
    if (!appId && !mediajelAppId) throw new Error("appId is required");

    return {
        appId: appId || mediajelAppId, // Legacy support for old universal tag
        version: version || "v1",
        collector: test ? process.env.MJ_STAGING_COLLECTOR_URL : process.env.MJ_PRODUCTION_COLLECTOR_URL,
        event,
        environment,
        retailId
    };
}

export default getContext