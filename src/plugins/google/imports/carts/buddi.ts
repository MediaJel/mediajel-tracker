import logger from 'src/shared/logger';

import buddiDataSource from '../../../../shared/environment-data-sources/buddi';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const buddiGoogleAds = (context: Context) => {
  buddiDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Buddi Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default buddiGoogleAds;
