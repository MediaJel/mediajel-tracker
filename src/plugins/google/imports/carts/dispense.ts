import dispenseDataSource from "../../../../shared/environment-data-sources/dispense";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dispenseGoogleAds = (context: Context) => {
  dispenseDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Dispense Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default dispenseGoogleAds;
