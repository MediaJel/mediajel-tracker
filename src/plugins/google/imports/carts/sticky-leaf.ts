import stickyLeafDataSource from "../../../../shared/environment-data-sources/sticky-leaf";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const stickyLeafGoogleAds = (context: Context) => {
  stickyLeafDataSource({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Sticky Leaf Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default stickyLeafGoogleAds;
