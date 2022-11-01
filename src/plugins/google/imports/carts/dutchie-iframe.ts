import dutchieIframeEvents from "../../../../shared/events/dutchie-iframe";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchieIframeGoogleAds = (context: Context) => {
  dutchieIframeEvents({
    transactionEvent(transactionData) {
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    },
  });
};

export default dutchieIframeGoogleAds;
