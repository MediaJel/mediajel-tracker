import logger from "src/shared/logger";
import observable from "src/shared/utils/create-events-observable";

import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchiePlusGoogleAds = (context: Context) => {
  observable.subscribe(({ transactionEvent: transactionData }) => {
    logger.info("🚀🚀🚀 Google Ads Dutchie Transaction Event ", { transactionData });
    window.gtag("event", "conversion", {
      send_to: `${context.conversionId}/${context.conversionLabel}`,
      value: transactionData.total,
      currency: transactionData.currency,
      transaction_id: transactionData.id,
    });
  });
};

export default dutchiePlusGoogleAds;
