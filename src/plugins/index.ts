import logger from 'src/shared/logger';

import { BingAdsPluginParams, GoogleAdsPluginParams, PluginParams } from '../shared/types';

interface ApplyPluginParams extends PluginParams, GoogleAdsPluginParams, BingAdsPluginParams {}

const applyPlugins = (context: ApplyPluginParams) => {
  const plugins = context.plugin.split(",");
  for (const plugin of plugins) {
    switch (plugin) {
      case "googleAds":
        import("./google").then(({ default: load }) => load(context));
        break;
      case "bingAds":
        import("./bing").then(({ default: load }) => load(context));
        break;
      default:
        logger.info("Plugin not found");
    }
  }
};

export default applyPlugins;
