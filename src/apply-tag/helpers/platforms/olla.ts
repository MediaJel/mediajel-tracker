import { TagContext } from "../../../shared/types";

const ollaTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {
  const dataLayer = window.dataLayer || [];

  function onDataLayerChange() {
    const data = window.dataLayer.slice(-1)[0]; // Gets the newest array member of dataLayer
    const dataLayerEvent = data[1];   // data.event is at array index 1

    if (data.event === "add_to_cart" || dataLayerEvent === "add_to_cart") {
      const products = data.items || data[2].items;   // data.items is at array index 2
      const { id, name, price, quantity, category } = products;

      window.tracker(
        "trackAddToCart",
        id.toString(),
        (name || "N/A").toString(),
        (category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (data.event === "remove_from_cart" || dataLayerEvent === "remove_from_cart") {
      const products = data.items || data[2].items;   // data.items is at array index 2
      const { id, name, price, quantity, category } = products;

      window.tracker(
        "trackRemoveFromCart",
        id.toString(),
        (name || "N/A").toString(),
        (category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (data.event === "purchase" || dataLayerEvent === "purchase") {
      // all ecommerce information is at array index 2
      const transaction_id = data.transaction_id || data[2].transaction_id;
      const transaction_total = data.value || data[2].value;
      const transaction_currency = data.currency || data[2].currency;
      const products = data.items || data[2].items;

      // Hardcoded because most fields are empty
      window.tracker(
        "addTrans",
        transaction_id.toString(),
        retailId ?? appId,
        parseFloat(transaction_total),
        0,
        0,
        "N/A",
        "N/A",
        "N/A",
        (transaction_currency || "USD").toString()
      );

      products.forEach(items => {
        const { id, name, price, quantity, category } = items;

        window.tracker(
          "addItem",
          transaction_id.toString(),
          id.toString(),
          (name || "N/A").toString(),
          (category || "N/A").toString(),
          parseFloat(price || 0),
          parseInt(quantity || 1),
          (transaction_currency || "USD").toString()
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

export default ollaTracker;
