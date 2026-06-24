import logger from "@mediajel/tracker-core/logger";
import observable from "@mediajel/tracker-core/utils/create-events-observable";

import { EnvironmentEvents, TransactionCartItem } from "@mediajel/tracker-core/types";
import { guard } from "@mediajel/tracker-core/utils/guard";

const weaveDataSource = () => {
  try {
    document.addEventListener("weave-analytics-event", guard((event: any) => {
      const data = event.detail.event;
      if (event.detail.event_name === "order_submit") {
        const products = data.items;

        observable.notify({
          transactionEvent: {
            id: data.order_id.toString(),
            total: data.total.total / 100,
            tax: data.total.tax / 100 || 0,
            shipping: 0,
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: "USD",
            items: products.map((product: any) => {
              return {
                orderId: data.order_id.toString(),
                productId: product.id.toString(),
                sku: product.id.toString(),
                name: product.name.toString(),
                category: product.category.toString(),
                unitPrice: product.price / 100 || 0,
                quantity: product.quantity / 1000 || 1,
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      }
    }, "weave"));
  } catch {}
};

export default weaveDataSource;
