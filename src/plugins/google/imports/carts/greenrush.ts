import logger from 'src/shared/logger';

import greenrushDataSource from '../../../../shared/environment-data-sources/greenrush';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const greenrushGoogleAds = (context: Context) => {
  greenrushDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Greenrush Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default greenrushGoogleAds;
