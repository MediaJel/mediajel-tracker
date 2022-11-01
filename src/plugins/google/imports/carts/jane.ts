import janeEvents from "../../../../shared/events/jane";
import { postMessageSource } from "../../../../shared/sources/post-message-source";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const janeGoogleAds = (context: Context) => {
  janeEvents({
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
