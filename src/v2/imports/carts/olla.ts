import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const ollaTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  datalayerSource((data: any): void => {
    const dataLayerEvent = data[1];
    if (data.event === "add_to_cart" || dataLayerEvent === "add_to_cart") {
      const products = data.items || data[2].items; // data.items is at array index 2
      const { id, name, price, quantity, category } = products[0];

      window.tracker("trackAddToCart", {
        sku: id.toString(),
        name: (name || "N/A").toString(),
        category: (category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: "USD",
      });
    }

    if (data.event === "remove_from_cart" || dataLayerEvent === "remove_from_cart") {
      const products = data.items || data[2].items; // data.items is at array index 2
      const { id, name, price, quantity, category } = products[0];

      window.tracker("trackRemoveFromCart", {
        sku: id.toString(),
        name: (name || "N/A").toString(),
        category: (category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: "USD",
      });
    }

    if (data.event === "purchase" || dataLayerEvent === "purchase") {
      // all ecommerce information is at array index 2
      const transaction_id = data.transaction_id || data[2].transaction_id;
      const transaction_total = data.value || data[2].value;
      const transaction_currency = data.currency || data[2].currency;
      const products = data.items || data[2].items;

      // Hardcoded because most fields are empty
      window.tracker("addTrans", {
        orderId: transaction_id.toString(),
        affiliation: retailId ?? appId,
        total: parseFloat(transaction_total),
        tax: 0,
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: (transaction_currency || "USD").toString(),
      });

      products.forEach((items) => {
        const { id, name, price, quantity, category } = items;

        window.tracker("addItem", {
          orderId: transaction_id.toString(),
          sku: id.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          price: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: (transaction_currency || "USD").toString(),
        });
      });

      window.tracker("trackTrans");
    }
  });
};

export default ollaTracker;
