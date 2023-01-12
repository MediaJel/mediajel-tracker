import lightspeedDataSource from "../../../../shared/environment-data-sources/lightspeed";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const lightspeedGoogleAds = (context: Context) => {
  lightspeedDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Lightspeed Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default lightspeedGoogleAds;
