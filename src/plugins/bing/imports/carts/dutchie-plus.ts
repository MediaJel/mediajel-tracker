import dutchiePlusDataSource from "../../../../shared/environment-data-sources/dutchie-plus";
import { BingAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends BingAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchiePlusBingAds = (context: Context) => {
  dutchiePlusDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Dutchie Plus Event ", { transactionData });

      window.uetq.push("event", "purchase", {
        transaction_id: transactionData.id,
        ecomm_prodid: transactionData.items.map((item) => item.sku),
        ecomm_pagetype: "purchase",
        ecomm_totalvalue: transactionData.total,
        revenue_value: transactionData.total,
        currency: "USD",
        items: transactionData.items.map((item) => ({
          id: item.sku,
          quantity: item.quantity,
          price: item.unitPrice,
        })),
      });
    },
  });
};

export default dutchiePlusBingAds;
