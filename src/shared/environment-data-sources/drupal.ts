import observable from "src/shared/utils/create-events-observable";

import { TransactionCartItem } from "../types";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import { runOncePerPageLoad } from "../sources/utils/trans-deduplicator";

const drupalDataSource = () => {
  window.dataLayer = window.dataLayer || [];

  for (let i = 0; i < window.dataLayer.length; i++) {
    const data = window.dataLayer[i];

    if (data.event === "purchase") {
      const ecommerce = data.ecommerce;

      isTrackerLoaded(() => {
        runOncePerPageLoad(() => {
          observable.notify({
            transactionEvent: {
              id: ecommerce.transaction_id.toString(),
              total: parseFloat(ecommerce.value),
              tax: parseFloat(ecommerce.tax) || 0,
              shipping: parseFloat(ecommerce.shipping) || 0,
              city: "N/A",
              country: "USA",
              currency: "USD",
              state: "N/A",
              items: ecommerce.items.map((item: any) => {
                return {
                  orderId: ecommerce.transaction_id.toString(),
                  sku: item.item_id.toString(),
                  name: (item.item_name || "N/A").toString(),
                  category: "N/A",
                  unitPrice: parseFloat(item.price || 0),
                  quantity: parseInt(item.quantity || 1),
                  currency: "USD",
                } as TransactionCartItem;
              }),
            },
          });
        });
      });
    }
  }
};

export default drupalDataSource;
