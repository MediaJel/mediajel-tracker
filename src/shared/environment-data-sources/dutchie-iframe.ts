import observable from "src/shared/utils/create-events-observable";

import { postMessageSource } from "../sources/post-message-source";
import { TransactionCartItem } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

const dutchieIframeDataSource = () => {
  postMessageSource((event: MessageEvent<any>) => {
    const rawData = tryParseJSONObject(event.data);
    const payload = rawData?.payload?.payload || null;

    if (rawData.event === "analytics:dataLayer" && payload.event === "add_to_cart") {
      const products = payload.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      observable.notify({
        addToCartEvent: {
          sku: item_id.toString(),
          name: item_name?.toString() || "N/A",
          category: item_category?.toString() || "N/A",
          unitPrice: parseFloat(price || "0"),
          quantity: parseInt(quantity || "1"),
          currency: "USD",
        },
      });
    }

    if (rawData.event === "analytics:dataLayer" && payload.event === "remove_from_cart") {
      const products = payload.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      observable.notify({
        removeFromCartEvent: {
          sku: item_id.toString(),
          name: item_name?.toString() || "N/A",
          category: item_category?.toString() || "N/A",
          unitPrice: parseFloat(price || "0"),
          quantity: parseInt(quantity || "1"),
          currency: "USD",
        },
      });
    }

    if (rawData.event === "analytics:dataLayer" && rawData.payload.payload["1"] === "purchase") {
      try {
        const transaction = rawData.payload.payload["2"];
        const products = transaction.items;
        const { transaction_id, value } = transaction;

        observable.notify({
          enhancedTransactionEvent: {
            ids: [transaction_id.toString()],
            id: transaction_id.toString(),
            total: parseFloat(value || 0),
            tax: 0,
            shipping: 0,
            city: "N/A",
            state: "N/A",
            country: "N/A",
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
        // window.tracker("trackError", JSON.stringify(error), "DUTCHIEIFRAME");
      }
    }

    if (rawData.event == "analytics:dataLayer" && payload.event == "purchase") {
      try {
        const transaction = payload.ecommerce;
        const products = transaction.items;
        const { transaction_id, value } = transaction;

        observable.notify({
          enhancedTransactionEvent: {
            ids: [transaction_id.toString()],
            id: transaction_id.toString(),
            total: parseFloat(value || 0),
            tax: 0,
            shipping: 0,
            city: "N/A",
            state: "N/A",
            country: "N/A",
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
        // window.tracker("trackError", JSON.stringify(error), "DUTCHIEIFRAME");
      }
    }
  });
};

export default dutchieIframeDataSource;
