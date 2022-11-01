import { postMessageSource } from "../sources/post-message-source";
import { PlatformEvents } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

const dutchieIframeEvents = ({ addToCartEvent, removeFromCartEvent, transactionEvent }: Partial<PlatformEvents>) => {
  postMessageSource((event: MessageEvent<any>) => {
    const rawData = tryParseJSONObject(event.data);
    const payload = rawData?.payload?.payload || null;

    if (rawData.event === "analytics:dataLayer" && payload.event === "add_to_cart") {
      const products = payload.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      addToCartEvent({
        sku: item_id.toString(),
        name: (item_name || "N/A").toString(),
        category: (item_category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: "USD",
      });
    }

    if (rawData.event === "analytics:dataLayer" && payload.event === "remove_from_cart") {
      const products = payload.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      removeFromCartEvent({
        sku: item_id.toString(),
        name: (item_name || "N/A").toString(),
        category: (item_category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: "USD",
      });
    }

    if (rawData.event == "analytics:dataLayer" && payload.event == "purchase") {
      const transaction = payload.ecommerce;
      const products = transaction.items;
      const { transaction_id, value } = transaction;

      transactionEvent({
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
            transaction_id: transaction_id.toString(),
            sku: item_id.toString(),
            name: (item_name || "N/A").toString(),
            category: (item_category || "N/A").toString(),
            unitPrice: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          };
        }),
      });
    }
  });
};

export default dutchieIframeEvents;
