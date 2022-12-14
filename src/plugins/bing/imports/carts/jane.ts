import janeDataSource from "../../../../shared/environment-data-sources/jane";
import { BingAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends BingAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const janeBingAds = (context: Context) => {
  janeDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Jane Transaction Event ", { transactionData });

      window.uetq.push("event", "PRODUCT_PURCHASE", {
        ecomm_prodid: transactionData.id,
        ecomm_pagetype: "PURCHASE",
        revenue_value: transactionData.total,
        currency: "USD",
      });
    },
  });
};

export default janeBingAds;
