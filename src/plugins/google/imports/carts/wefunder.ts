import wefunderDataSource from "../../../../shared/environment-data-sources/wefunder";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const wefunderGoogleAds = (context: Context) => {
  wefunderDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Wefunder Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default wefunderGoogleAds;
