import { GoogleAdsPluginParams, PluginParams } from "../shared/types";

interface ApplyPluginParams extends PluginParams, GoogleAdsPluginParams {}

const applyPlugins = (context: ApplyPluginParams) => {
  switch (context.plugin) {
    case "googleAds":
      import("./google").then(({ default: load }) => load(context));
      break;
    default:
      console.log("Plugin not found");
  }
};

export default applyPlugins;
