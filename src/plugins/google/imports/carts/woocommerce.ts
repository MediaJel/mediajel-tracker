import woocommerceEvents from "../../../../shared/events/woocommerce";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const woocommerceGoogleAds = (context: Context) => {
  woocommerceEvents({
    transactionEvent(transactionData) {
      console.log("🚀🚀🚀 Woocommerce Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default woocommerceGoogleAds;
