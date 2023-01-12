import grassdoorDataSource from "../../../../shared/environment-data-sources/grassdoor";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const grassdoorGoogleAds = (context: Context) => {
  grassdoorDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Grassdoor Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default grassdoorGoogleAds;
