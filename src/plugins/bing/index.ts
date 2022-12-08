import { GoogleAdsPluginParams } from "../../shared/types";

const createBingAdsPlugin = (context: GoogleAdsPluginParams) => {
  switch (context.environment) {
    default: {
      console.warn("Bing Ads does not support this environment");
    }
  }
};

export default createBingAdsPlugin;
