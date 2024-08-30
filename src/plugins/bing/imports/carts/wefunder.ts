import logger from 'src/shared/logger';

import wefunderDataSource from '../../../../shared/environment-data-sources/wefunder';
import { BingAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends BingAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const wefunderBingAds = (context: Context) => {
  wefunderDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Wefunder Transaction Event ", { transactionData });

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

export default wefunderBingAds;
