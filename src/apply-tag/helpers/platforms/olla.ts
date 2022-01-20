import { TagContext } from "../../../shared/types";

const ollaTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {

  const dataLayer = window.dataLayer || [];

  function onDataLayerChange() {
    const data = dataLayer.slice(-1)[0]; // Gets the newest array member of dataLayer

    if (data.event === "add_to_cart") {
      const items = data.items;

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

    if (data.event === "remove_from_cart") {
      const items = data.items;

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

    if (data.event === "purchase") {
      const transaction_id = data.transaction_id;
      const transaction_total = data.value;
      const transaction_currency = data.currency;
      const items = data.items;

      window.tracker(
        "addTrans",
        transaction_id.toString(),                              // Transaction ID - required
        retailId ?? appId,                                      // Affiliation or store name
        parseFloat(transaction_total),                          // Total - required
        0,                                                      // Tax
        0,                                                      // Shipping
        "N/A",                                                  // City
        "N/A",                                                  // State or province
        "USA",                                                  // Country
        (transaction_currency || "USD").toString()              // Currency code
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
      console.log("trackTrans!");
    }
  }

  dataLayer.push = function () {
    Array.prototype.push.apply(this, arguments);
    console.log("dataLayer.push!");
    onDataLayerChange();
  };
};

export default ollaTracker;