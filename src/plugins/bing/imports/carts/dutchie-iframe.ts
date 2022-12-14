import dutchieIframeDataSource from "../../../../shared/environment-data-sources/dutchie-iframe";
import { BingAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends BingAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchieIframeBingAds = (context: Context) => {
  dutchieIframeDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Dutchie Transaction Event ", { transactionData });

      window.uetq.push("event", "PRODUCT_PURCHASE", {
        ecomm_prodid: transactionData.id,
        ecomm_pagetype: "PURCHASE",
        revenue_value: transactionData.total,
        currency: "USD",
      });
    },
  });
};

export default dutchieIframeBingAds;
