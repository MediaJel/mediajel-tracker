import observable from "src/shared/utils/create-events-observable";

import { datalayerSource } from "../sources/google-datalayer-source";
import { TransactionCartItem } from "../types";

const grassDoorTracker = () => {
  datalayerSource((data: any): void => {
    if (data.event === "Product Added") {
      const products = data;
      const { sku, name, price, quantity, category } = products;

      observable.notify({
        addToCartEvent: {
          sku: sku.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          unitPrice: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: "USD",
        },
      });
    }

    if (data.event === "Product Removed") {
      const products = data;
      const { sku, name, price, quantity, category } = products;

      observable.notify({
        removeFromCartEvent: {
          sku: sku.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          unitPrice: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: "USD",
        },
      });
    }

    if (data.event === "Order Made") {
      try {
        const transaction_id = data.order_id;
        const transaction_total = data.revenue;
        const transaction_tax = data.tax;
        const transaction_shipping = data.shipping;
        const products = data.products;

        observable.notify({
          enhancedTransactionEvent: {
            ids: [transaction_id.toString()],
            id: transaction_id.toString(),
            total: parseFloat(transaction_total || 0),
            tax: parseFloat(transaction_tax || 0),
            shipping: parseFloat(transaction_shipping || 0),
            city: "N/A",
            state: "N/A",
            country: "USA",
            currency: "USD",
            items: products.map((product) => {
              const { item_id, item_name, item_category, price, quantity } = product;
              return {
                orderId: transaction_id.toString(),
                productId: item_id.toString(),
                sku: item_id.toString(),
                name: (item_name || "N/A").toString(),
                category: (item_category || "N/A").toString(),
                unitPrice: parseFloat(price || 0),
                quantity: parseInt(quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {
        // window.tracker('trackError', JSON.stringify(error), 'GRASSDOOR');
      }
    }
  });
};

export default grassDoorTracker;
