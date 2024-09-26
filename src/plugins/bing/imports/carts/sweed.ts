import logger from 'src/shared/logger';

import sweedDataSource from '../../../../shared/environment-data-sources/sweed';
import { BingAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends BingAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const sweedBingAds = (context: Context) => {
  sweedDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Sweed Transaction Event ", { transactionData });
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

export default sweedBingAds;
