import squareDataSource from "../../../../shared/environment-data-sources/square";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const squareGoogleAds = (context: Context) => {
  squareDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Square Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default squareGoogleAds;
