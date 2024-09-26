import logger from 'src/shared/logger';

import sweedDataSource from '../../../../shared/environment-data-sources/sweed';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const sweedGoogleAds = (context: Context) => {
  sweedDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Sweed Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default sweedGoogleAds;
