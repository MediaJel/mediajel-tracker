import logger from 'src/shared/logger';

import dutchieIframeDataSource from '../../../../shared/environment-data-sources/dutchie-iframe';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchieIframeGoogleAds = (context: Context) => {
  dutchieIframeDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Dutchie Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default dutchieIframeGoogleAds;
