import { TagContext } from "../../../shared/types";

const dutchieSubdomainTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {
  const dataLayer = window.dataLayer || [];

  function onDataLayerChange() {
    const data = dataLayer.slice(-1)[0]; // Gets the newest array member of dataLayer

    if (data.event === "add_to_cart") {
      const items = data.ecommerce.items;

      items.forEach((item, i) => {
        const { item_id, item_name, price, quantity, item_category } = item;

        window.tracker(
          "trackAddToCart",
          item_id.toString(),
          item_name,
          item_category,
          price,
          quantity,
          "USD"
        );
      });
    }

    if (data.event === "remove_from_cart") {
      const items = data.ecommerce.items;

      items.forEach((item, i) => {
        const { item_id, item_name, price, quantity, item_category } = item;
        window.tracker(
          "trackRemoveFromCart",
          item_id.toString(),
          item_name,
          item_category,
          price,
          quantity,
          "USD"
        );
      });
    }

    if (data.event === "purchase") {
      const ecommerce = data.ecommerce;
      const { transaction_id, value } = ecommerce;
      const items = ecommerce.items;

      // Hardcoded because most fields are empty
      window.tracker(
        "addTrans",
        transaction_id.toString(),
        retailId ?? appId,
        parseInt(value),
        0,
        0,
        "N/A",
        "N/A",
        "N/A",
        "USD"
      );

      items.forEach((item, i) => {
        const { item_id, item_name, price, quantity, item_category } = item;

        window.tracker(
          "addItem",
          transaction_id.toString(),
          item_id,
          item_name,
          item_category,
          price,
          quantity,
          "USD"
        );
      });

      window.tracker('trackTrans');
    }
  }

  const originalPush = dataLayer.push
  dataLayer.push = function (...args) {
    originalPush(...args);
    onDataLayerChange();
  };
};

export default dutchieSubdomainTracker;