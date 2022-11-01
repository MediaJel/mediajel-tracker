import dutchieIframeEvents from "../../../../shared/carts/dutchie-iframe";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchieIframeGoogleAds = (context: Context) => {
  dutchieIframeEvents({
    transactionEvent(transactionEvent) {
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionEvent.total,
        currency: transactionEvent.currency,
        transaction_id: transactionEvent.id,
      });
    },
  });
};

export default dutchieIframeGoogleAds;
