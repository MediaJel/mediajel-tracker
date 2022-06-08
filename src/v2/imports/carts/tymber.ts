import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const tymberTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  datalayerSource((data: any): void => {
    if (data.event === "addToCart") {
      const products = data.ecommerce.add.products;
      const currency = data.ecommerce.currency;
      const { brand, category, id, name, price, quantity } = products[0];

      window.tracker("trackAddToCart", {
        sku: id.toString(),
        name: (name || "N/A").toString(),
        category: (category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: (currency || "USD").toString(),
      });
    }

    if (data.event === "removeFromCart") {
      const products = data.ecommerce.remove.products;
      const currency = data.ecommerce.currency;
      const { brand, category, id, name, price, quantity } = products[0];

      window.tracker("trackRemoveFromCart", {
        sku: id.toString(),
        name: (name || "N/A").toString(),
        category: (category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: (currency || "USD").toString(),
      });
    }

    if (data.event === "Order Successful") {
      window.tracker("setUserId", data.orderEmail);
    }

    // TODO: Get order details from 'Order Successful' event in dataLayer
    if (data.event === "purchase") {
      const transaction = data.ecommerce.actionField;
      const products = data.ecommerce.products;
      const { id, revenue, tax } = transaction;

      window.tracker("addTrans", {
        orderId: id.toString(),
        affiliation: retailId ?? appId,
        total: parseFloat(revenue),
        tax: parseFloat(tax),
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
      });

      products.forEach((items) => {
        const { brand, category, id, name, price, quantity } = items;

        window.tracker("addItem", {
          orderId: transaction.id.toString(),
          sku: items.id.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          price: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: "USD",
        });
      });

      window.tracker("trackTrans");
    }
  });
};

export default tymberTracker;
