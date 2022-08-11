import { QueryStringContext } from "../../../shared/types";

const greendoorTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  const dataLayer = window.dataLayer || [];

  function onDataLayerChange() {
    const data = window.dataLayer.slice(-1)[0]; // Gets the newest array member of dataLayer

    if (data.event === "Product Added") {
      const products = data;
      const { sku, name, price, quantity, category } = products;

      window.tracker(
        "trackAddToCart",
        sku.toString(),
        (name || "N/A").toString(),
        (category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (data.event === "Product Removed") {
      const products = data;
      const { sku, name, price, quantity, category } = products;

      window.tracker(
        "trackRemoveFromCart",
        sku.toString(),
        (name || "N/A").toString(),
        (category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (data.event === "Order Made") {
      const transaction_id = data.order_id;
      const transaction_total = data.revenue;
      const transaction_tax = data.tax;
      const transaction_shipping = data.shipping;
      const products = data.products;

      window.tracker(
        "addTrans",
        transaction_id.toString(),
        retailId ?? appId,
        parseFloat(transaction_total || 0),
        parseFloat(transaction_tax || 0),
        parseFloat(transaction_shipping || 0),
        "N/A",
        "N/A",
        "N/A",
        "USD"
      );

      products.forEach((items) => {
        const { product_id, name, price, quantity, category } = items;

        window.tracker(
          "addItem",
          transaction_id.toString(),
          product_id.toString(),
          (name || "N/A").toString(),
          (category || "N/A").toString(),
          parseFloat(price || 0),
          parseInt(quantity || 1),
          "USD"
        );
      });

      window.tracker("trackTrans");
    }
  }

  // Stores the original dataLayer.push method before modifying it to execute our snowplow tracker
  const originalPush = dataLayer.push;
  dataLayer.push = function (...args) {
    originalPush(...args);
    onDataLayerChange();
  };
};

export default greendoorTracker;
