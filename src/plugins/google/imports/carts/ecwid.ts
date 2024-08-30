import logger from 'src/shared/logger';

import ecwidDataSource from '../../../../shared/environment-data-sources/ecwid';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const ecwidGoogleAds = (context: Context) => {
  ecwidDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Ecwid Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default ecwidGoogleAds;
