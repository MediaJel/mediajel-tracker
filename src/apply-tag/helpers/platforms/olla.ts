import { TagContext } from "../../../shared/types";

const ollaTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {

  const dataLayer = window.dataLayer || [];

  function onDataLayerChange() {
    const data = dataLayer.slice(-1)[0]; // Gets the newest array member of dataLayer

    if (data.event === "add_to_cart") {
      const items = data.ecommerce.items;

      items.forEach((item, i) => {
        const { id, name, price, quantity, category } = item;

        window.tracker(
          "trackAddToCart",
          id.toString(),
          (name || "N/A").toString(),
          (category || "N/A").toString(),
          parseFloat(price || 0),
          parseInt(quantity || 1),
          "USD"
        );
      });
    }

    if (data.event === "remove_from_cart") {
      const items = data.ecommerce.items;

      items.forEach((item, i) => {
        const { id, name, price, quantity, category } = item;

        window.tracker(
          "trackRemoveFromCart",
          id.toString(),
          (name || "N/A").toString(),
          (category || "N/A").toString(),
          parseFloat(price || 0),
          parseInt(quantity || 1),
          "USD"
        );
      });
    }

    if (data.event === "purchase") {
      const ecommerce = data.ecommerce;
      const { transaction_id, value, currency } = ecommerce;
      const items = ecommerce.items;

      window.tracker(
        "addTrans",
        transaction_id.toString(),
        retailId ?? appId,
        parseFloat(value),
        0,
        0,
        "N/A",
        "N/A",
        "USA",
        (currency || "USD").toString()
      );

      items.forEach((item, i) => {
        const { id, name, price, quantity, category } = item;

        window.tracker(
          "addItem",
          transaction_id.toString(),
          id.toString(),
          (name || "N/A").toString(),
          (category || "N/A").toString(),
          parseFloat(price || 0),
          parseInt(quantity || 1)
        );
      });

      window.tracker('trackTrans');
    }
  }

  dataLayer.push = function () {
    Array.prototype.push.apply(this, arguments);
    onDataLayerChange();
  };
};

export default ollaTracker;