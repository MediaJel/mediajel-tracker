import { QueryStringContext } from "../../../shared/types";

const dutchieSubdomainTracker = ({
  appId,
  retailId,
}: Pick<QueryStringContext, "appId" | "retailId">) => {
  const dataLayer = window.dataLayer || [];

  function onDataLayerChange() {
    const data = dataLayer.slice(-1)[0]; // Gets the newest array member of dataLayer

    if (data.event === "add_to_cart") {
      const products = data.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      window.tracker(
        "trackAddToCart",
        item_id.toString(),
        (item_name || "N/A").toString(),
        (item_category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (data.event === "remove_from_cart") {
      const products = data.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      window.tracker(
        "trackRemoveFromCart",
        item_id.toString(),
        (item_name || "N/A").toString(),
        (item_category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (data.event === "purchase") {
      const transaction = data.ecommerce;
      const products = transaction.items;
      const { transaction_id, value } = transaction;

      // Hardcoded because most fields are empty
      window.tracker(
        "addTrans",
        transaction_id.toString(),
        retailId ?? appId,
        parseFloat(value),
        0,
        0,
        "N/A",
        "N/A",
        "N/A",
        "USD"
      );

      products.forEach(items => {
        const { item_id, item_name, item_category, price, quantity } = items;

        window.tracker(
          "addItem",
          transaction_id.toString(),
          item_id.toString(),
          (item_name || "N/A").toString(),
          (item_category || "N/A").toString(),
          parseFloat(price || 0),
          parseInt(quantity || 1),
          "USD"
        );
      });

      window.tracker('trackTrans');
    }
  }

  // Stores the original dataLayer.push method before modifying it to execute our snowplow tracker
  const originalPush = dataLayer.push
  dataLayer.push = function (...args) {
    originalPush(...args);
    onDataLayerChange();
  };
};

export default dutchieSubdomainTracker;