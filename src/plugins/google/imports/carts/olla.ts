import logger from 'src/shared/logger';

import ollaDataSource from '../../../../shared/environment-data-sources/olla';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const ollaGoogleAds = (context: Context) => {
  ollaDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Olla Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default ollaGoogleAds;
