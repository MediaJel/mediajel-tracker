import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const tymberTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  datalayerSource((data: any): void => {
    if (data.event === "addToCart") {
      const products = data.ecommerce.add.products;
      const currency = data.ecommerce.currency;
      const { brand, category, id, name, price, quantity } = products[0];

      window.tracker(
        "trackAddToCart",
        id.toString(),
        (name || "N/A").toString(),
        (category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        (currency || "USD").toString()
      );
    }

    if (data.event === "removeFromCart") {
      const products = data.ecommerce.remove.products;
      const currency = data.ecommerce.currency;
      const { brand, category, id, name, price, quantity } = products[0];

      window.tracker(
        "trackRemoveFromCart",
        id.toString(),
        (name || "N/A").toString(),
        (category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        (currency || "USD").toString()
      );
    }

    if (data.event === "Order Successful") {
      window.tracker("setUserId", data.orderEmail);
    }

    // TODO: Get order details from 'Order Successful' event in dataLayer
    if (data.event === "purchase") {
      const transaction = data.ecommerce.actionField;
      const products = data.ecommerce.products;
      const { id, revenue, tax } = transaction;

      window.tracker(
        "addTrans",
        id.toString(),
        retailId ?? appId,
        parseFloat(revenue),
        parseFloat(tax),
        0,
        "N/A",
        "N/A",
        "N/A",
        "USD"
      );

      products.forEach((items) => {
        const { brand, category, id, name, price, quantity } = items;

        window.tracker(
          "addItem",
          transaction.id.toString(),
          items.id.toString(),
          (name || "N/A").toString(),
          (category || "N/A").toString(),
          parseFloat(price || 0),
          parseInt(quantity || 1),
          "USD"
        );
      });

      window.tracker("trackTrans");
    }
  });
};

export default tymberTracker;
