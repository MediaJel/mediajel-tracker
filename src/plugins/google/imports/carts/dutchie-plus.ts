import dutchiePlusDataSource from "../../../../shared/environment-data-sources/dutchie-plus";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchiePlusGoogleAds = (context: Context) => {
  dutchiePlusDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Dutchie Plus Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default dutchiePlusGoogleAds;
