import logger from 'src/shared/logger';

import meadowDataSource from '../../../../shared/environment-data-sources/meadow';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const meadowGoogleAds = (context: Context) => {
  meadowDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Meadow Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default meadowGoogleAds;
