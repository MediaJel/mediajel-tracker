import { postMessageSource } from "../../../shared/sources/post-message-source";
import { QueryStringContext } from "../../../shared/types";
import { tryParseJSONObject } from "../../../shared/utils/try-parse-json";

const dutchieIframeTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  postMessageSource((event: MessageEvent<any>): void => {
    try {
      const rawData = tryParseJSONObject(event.data);
      const payload = rawData?.payload?.payload || null;

      if (rawData.event === "analytics:dataLayer" && payload.event === "add_to_cart") {
        const products = payload.ecommerce.items;
        const { item_id, item_name, item_category, price, quantity } = products[0];

        window.tracker("trackAddToCart", {
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

        window.tracker("trackRemoveFromCart", {
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

        // Hardcoded because most fields are empty
        window.tracker("addTrans", {
          orderId: transaction_id.toString(),
          affiliation: retailId ?? appId,
          total: parseFloat(value),
          tax: 0,
          shipping: 0,
          city: "N/A",
          state: "N/A",
          country: "N/A",
          currency: "USD",
        });

        products.forEach((items) => {
          const { item_id, item_name, item_category, price, quantity } = items;

          window.tracker("addItem", {
            orderId: transaction_id.toString(),
            sku: item_id.toString(),
            name: (item_name || "N/A").toString(),
            category: (item_category || "N/A").toString(),
            price: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          });
        });

        window.tracker("trackTrans");
      }
    } catch (e) {
      throw e;
    }
  });
};

export default dutchieIframeTracker;
