import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const dutchieSubdomainTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  datalayerSource((data: any): void => {
    if (data.event === "add_to_cart") {
      const products = data.ecommerce.items;
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

    if (data.event === "remove_from_cart") {
      const products = data.ecommerce.items;
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

    if (data.event === "purchase") {
      const transaction = data.ecommerce;
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
  });
};

export default dutchieSubdomainTracker;
