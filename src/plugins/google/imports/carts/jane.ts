import janeDataSource from "../../../../shared/environment-data-sources/jane";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const janeGoogleAds = (context: Context) => {
  janeDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Jane Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default janeGoogleAds;
