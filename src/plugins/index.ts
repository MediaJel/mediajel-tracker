import { BingAdsPluginParams, GoogleAdsPluginParams, PluginParams } from "../shared/types";

interface ApplyPluginParams extends PluginParams, GoogleAdsPluginParams, BingAdsPluginParams {}

const applyPlugins = (context: ApplyPluginParams) => {
  switch (context.plugin) {
    case "googleAds":
      import("./google").then(({ default: load }) => load(context));
      break;
    case "bingAds":
      import("./bing").then(({ default: load }) => load(context));
      break;
    default:
      console.log("Plugin not found");
  }
};

export default applyPlugins;
