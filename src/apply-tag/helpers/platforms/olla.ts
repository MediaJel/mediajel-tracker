import { TagContext } from "../../../shared/types";
import { observeArray } from "../utils/observe-array";
import 'node_modules/data-layer-helper/dist/data-layer-helper';


const ollaTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {

  const dataLayer = window.dataLayer || [];
  // observeArray(window.dataLayer, onDataLayerChange);

  const helper = new DataLayerHelper(dataLayer, { listener: onDataLayerChange });

  function onDataLayerChange() {
    const data = window.dataLayer.slice(-1)[0]; // Gets the newest array member of dataLayer

    // data.event is at array index 1
    // data.items is at array index 2
    if (data.event === "add_to_cart" || data[1] === "add_to_cart") {
      const items = data.items || data[2].items;

      items.forEach((item) => {
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

    // data.event is at array index 1
    // data.items is at array index 2
    if (data.event === "remove_from_cart" || data[1] === "remove_from_cart") {
      const items = data.items || data[2].items;

      items.forEach((item) => {
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

    // data.event is at array index 1
    // data.items and everything else is at array index 2
    if (data.event === "purchase" || data[1] === "purchase") {
      const transaction_id = data.transaction_id || data[2].transaction_id;
      const transaction_total = data.value || data[2].value;
      const transaction_currency = data.currency || data[2].currency;
      const items = data.items || data[2].items;

      window.tracker(
        "addTrans",
        transaction_id.toString(),
        retailId ?? appId,
        parseFloat(transaction_total),
        0,
        0,
        "N/A",
        "N/A",
        "USA",
        (transaction_currency || "USD").toString()
      );

      items.forEach((item) => {
        const { id, name, price, quantity, category } = item;

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
};

export default ollaTracker;