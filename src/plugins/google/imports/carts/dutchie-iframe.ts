import dutchieIframeEvents from "../../../../shared/carts/dutchie-iframe";
import { GoogleAdsPluginParams, SnowplowParams } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchieIframeGoogleAds = (context: Context) => {
  dutchieIframeEvents({
    addToCartEvent(cartEvent) {
      console.log("Added to cart");
      window.gtag("event", "add_to_cart", {
        items: [
          {
            id: cartEvent.sku,
            name: cartEvent.name,
            category: cartEvent.category,
            price: cartEvent.unitPrice,
            quantity: cartEvent.quantity,
          },
        ],
      });
    },
    removeFromCartEvent(cartEvent) {
      console.log("Removed from cart");
      window.gtag("event", "remove_from_cart", {
        items: [
          {
            id: cartEvent.sku,
            name: cartEvent.name,
            category: cartEvent.category,
            price: cartEvent.unitPrice,
            quantity: cartEvent.quantity,
          },
        ],
      });
    },
    transactionEvent(transactionEvent) {
      console.log("Transaction event");
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
