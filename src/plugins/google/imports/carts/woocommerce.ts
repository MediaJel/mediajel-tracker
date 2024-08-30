import logger from 'src/shared/logger';

import woocommerceDataSource from '../../../../shared/environment-data-sources/woocommerce';
import { GoogleAdsPluginParams, SnowplowParams } from '../../../../shared/types';

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const woocommerceGoogleAds = (context: Context) => {
  woocommerceDataSource({
    transactionEvent(transactionData) {
      logger.info("🚀🚀🚀 Woocommerce Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default woocommerceGoogleAds;
