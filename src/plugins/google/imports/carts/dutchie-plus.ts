import dutchiePlusDataSource from "../../../../shared/environment-data-sources/dutchie-plus";
import { GoogleAdsPluginParams, SnowplowParams, TransactionCartItem } from "../../../../shared/types";

interface Context extends GoogleAdsPluginParams, Pick<SnowplowParams, "environment"> {}

const dutchiePlusGoogleAds = (context: Context) => {
  // IMPORTANT NOTE: dutchieplus cart is for CURALEAF only
  window.dataLayer = window.dataLayer || [];

  // if window.locatoin.href includes 'order-confirmation'
  if (!window.location.href.includes("order-confirmation")) {
    return;
  }

  // loop through the dataLayer and find the purchase event
  for (let i = 0; i < window.dataLayer.length; i++) {
    const data = window.dataLayer[i];

    // if local storage: order id and current order id not the same then send transactionEvent
    if (data.event === "purchase") {
      console.log("logging dataLayer event:");
      console.log(data);

      const orderContent: HTMLDivElement | any = document.getElementsByClassName("order-content")[0];
      const text: string = orderContent?.innerText;
      const regex = /#(\d+)/;
      const orderNumber = text.match(regex)[1];

      console.log("orderNumber: ", orderNumber);

      console.log(localStorage.getItem("orderNumber") === orderNumber);

      if (localStorage.getItem("orderNumber") === orderNumber) {
        return;
      }

      // set order id to local storage to prevent duplicate events
      localStorage.setItem("orderNumber", orderNumber);

      console.log("tracking order...");

      const { id, revenue, tax } = data.ecommerce.purchase.actionField;
      const items = data.ecommerce.purchase.products;

      const transactionData = {
        total: parseFloat(revenue),
        id: id.toString(),
        tax: parseFloat(tax || 0),
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
        items: items.map((item) => {
          const { id, name, category, price, quantity } = item;

          return {
            orderId: id.toString(),
            sku: id.toString(),
            name: name?.toString() || "N/A",
            category: category?.toString() || "N/A",
            unitPrice: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          } as TransactionCartItem;
        }),
      };

      console.log("🚀🚀🚀 Dutchie Plus Transaction Event ", { transactionData });
      window.gtag("event", "conversion", {
        send_to: `${context.conversionId}/${context.conversionLabel}`,
        value: transactionData.total,
        currency: transactionData.currency,
        transaction_id: transactionData.id,
      });
    }
  }
};

export default dutchiePlusGoogleAds;
