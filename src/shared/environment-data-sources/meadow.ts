import logger from "src/shared/logger";
import observable from "src/shared/utils/create-events-observable";

import { postMessageSource } from "../sources/post-message-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const meadowTracker = () => {
  postMessageSource((event: MessageEvent<any>): void => {
    const rawData = event.data;

    if (rawData.type === "ANALYTICS_CART_ADD") {
      const cartData = rawData.payload;
      const product = rawData.payload.product;

      observable.notify({
        addToCartEvent: {
          sku: product.id.toString(),
          name: (product.name || "N/A").toString(),
          category: (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
          unitPrice: parseFloat(product.option.price || 0) / 100,
          quantity: parseInt(cartData.quantity || 1),
          currency: "USD",
        },
      });
    }

    if (rawData.type === "ANALYTICS_CART_REMOVE") {
      const cartData = rawData.payload;
      const product = rawData.payload.product;

      observable.notify({
        removeFromCartEvent: {
          sku: product.id.toString(),
          name: (product.name || "N/A").toString(),
          category: (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
          unitPrice: parseFloat(product.option.price || 0) / 100,
          quantity: parseInt(cartData.quantity || 1),
          currency: "USD",
        },
      });
    }

    if (rawData.type === "ANALYTICS_PURCHASE") {
      try {
        const transaction = rawData.payload.order;
        const products = transaction.lineItems;

        observable.notify({
          enhancedTransactionEvent: {
            ids: [transaction.id.toString()],
            id: transaction.id.toString(),
            total: parseFloat(transaction.netPrice) / 100,
            tax: parseFloat(transaction.taxesTotal || 0) / 100,
            shipping: parseFloat(transaction.delivery_fee) || 0,
            city: "N/A",
            state: "N/A",
            country: "USA",
            currency: "USD",
            items: products.map((items) => {
              const { product, quantity } = items;
              return {
                orderId: transaction.id.toString(),
                productId: product.id.toString(),
                sku: product.id.toString(),
                name: (product.name || "N/A").toString(),
                category: (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
                unitPrice: parseFloat(product.option.price || 0) / 100,
                quantity: parseInt(quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {
        // window.tracker('trackError', JSON.stringify(error), 'MEADOW');
      }
    }
  });
};

export default meadowTracker;
