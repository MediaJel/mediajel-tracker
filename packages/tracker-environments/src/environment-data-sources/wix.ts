import logger from "@mediajel/tracker-core/logger";
import observable from "@mediajel/tracker-core/utils/create-events-observable";

import { TransactionCartItem } from "@mediajel/tracker-core/types";
import { guard } from "@mediajel/tracker-core/utils/guard";

const wixTrackerDataSource = () => {
  function registerListeners() {
    window.wixDevelopersAnalytics?.register("conversionListener", guard((e, p) => {
      logger.debug("Event: ", e);
      if (e === "AddToCart") {
        logger.debug("AddToCart: ", p);
        observable.notify({
          addToCartEvent: {
            sku: (p.sku || "N/A").toString(),
            name: (p.name || "N/A").toString(),
            category: (p.category || "N/A").toString(),
            unitPrice: parseFloat(p.price),
            quantity: parseFloat(p.quantity),
            currency: (p.currency || "USD").toString(),
          },
        });
      }

      if (e === "RemoveFromCart") {
        logger.debug("RemoveFromCart: ", p);
        observable.notify({
          removeFromCartEvent: {
            sku: (p.sku || "N/A").toString(),
            name: (p.name || "N/A").toString(),
            category: (p.category || "N/A").toString(),
            unitPrice: parseFloat(p.price),
            quantity: parseFloat(p.quantity),
            currency: (p.currency || "USD").toString(),
          },
        });
      }

      if (e === "Purchase") {
        logger.debug("Purchase: ", p);
        observable.notify({
          transactionEvent: {
            id: (p.orderId || "N/A").toString(),
            total: parseFloat(p.revenue || 0),
            tax: parseFloat(p.tax || 0),
            shipping: parseFloat(p.shipping || 0),
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: (p.currency || "USD").toString(),
            items: p.contents.map((product) => {
              return {
                orderId: (p.orderId || "N/A").toString(),
                productId: (product.id || "N/A").toString(),
                sku: (product.sku || "N/A").toString(),
                name: (product.name || "N/A").toString(),
                category: (product.category || "N/A").toString(),
                unitPrice: parseFloat(product.price || 0),
                quantity: parseFloat(product.quantity || 1),
                currency: (p.currency || "USD").toString(),
              } as TransactionCartItem;
            }),
          },
        });
      }
    }, "wix"));
  }

  window.wixDevelopersAnalytics ? registerListeners() : window.addEventListener('wixDevelopersAnalyticsReady', registerListeners);
};

export default wixTrackerDataSource;
