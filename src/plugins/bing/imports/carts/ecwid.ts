import logger from 'src/shared/logger';

import ecwidDataSource from '../../../../shared/environment-data-sources/ecwid';
import { BingAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends BingAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const ecwidBingAds = (context: Context) => {
  ecwidDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Ecwid Transaction Event ", { transactionData });

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

export default ecwidBingAds;
