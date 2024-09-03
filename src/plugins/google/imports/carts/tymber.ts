import logger from 'src/shared/logger';

import tymberDataSource from '../../../../shared/environment-data-sources/tymber';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const tymberGoogleAds = (context: Context) => {
  tymberDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 tymber Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default tymberGoogleAds;
