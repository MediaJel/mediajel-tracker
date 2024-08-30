import logger from 'src/shared/logger';

import shopifyDataSource from '../../../../shared/environment-data-sources/shopify';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const shopifyGoogleAds = (context: Context) => {
  shopifyDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Shopify Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default shopifyGoogleAds;
