import dutchieSubdomainDataSource from "../../../../shared/environment-data-sources/dutchie-subdomain";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchieSubdomainGoogleAds = (context: Context) => {
  dutchieSubdomainDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Dutchie Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default dutchieSubdomainGoogleAds;
