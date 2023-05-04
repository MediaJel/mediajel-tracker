import stickyLeafDataSource from "@/shared/environment-data-sources/sticky-leaf";
import { BingAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends BingAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const stickLeafBingAds = (context: Context) => {
  stickyLeafDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Sticky Leaf Transaction Event ", { transactionData });

      window.uetq.push("event", "purchase", {
        transaction_id: transactionData.id,
        ecomm_prodid: [],
        ecomm_pagetype: "purchase",
        ecomm_totalvalue: transactionData.total,
        revenue_value: transactionData.total,
        currency: "USD",
        items: [],
      });
    },
  });
};

export default stickLeafBingAds;
