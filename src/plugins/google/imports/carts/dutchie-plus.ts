import logger from "src/shared/logger";

import dutchiePlusDataSource, {
  dutchiePlusDataSourceObservable,
} from "../../../../shared/environment-data-sources/dutchie-plus";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchieIframeGoogleAds = (context: Context) => {
  dutchiePlusDataSourceObservable.subscribe(({ transactionEvent: transactionData }) => {
    logger.info("🚀🚀🚀 Google Ads Dutchie Transaction Event ", { transactionData });
    window.gtag("event", "conversion", {
      send_to: `${context.conversionId}/${context.conversionLabel}`,
      value: transactionData.total,
      currency: transactionData.currency,
      transaction_id: transactionData.id,
    });
  });
  // dutchiePlusDataSource({
  //   transactionEvent(transactionData) {
  //     logger.info("🚀🚀🚀 Dutchie Transaction Event ", { transactionData });
  //     window.gtag("event", "conversion", {
  //       send_to: `${context.conversionId}/${context.conversionLabel}`,
  //       value: transactionData.total,
  //       currency: transactionData.currency,
  //       transaction_id: transactionData.id,
  //     });
  //   },
  // });
};

export default dutchieIframeGoogleAds;
