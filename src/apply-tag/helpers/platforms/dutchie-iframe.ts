import { TagContext } from "../../../shared/types";

const dutchieIframeTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {
  function receiveMessage(event) {
    const rawData = JSON.parse(event.data);
    const payload = rawData.payload.payload;
    const products = payload.ecommerce.items;

    if (rawData.event === "analytics:dataLayer" && payload.event === "add_to_cart") {
      const { item_id, item_name, item_category, price, quantity } = products[0];

      window.tracker(
        "trackAddToCart",
        (item_id).toString(),
        (item_name || "N/A").toString(),
        (item_category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (rawData.event === "analytics:dataLayer" && payload.event === "remove_from_cart") {
      const { item_id, item_name, item_category, price, quantity } = products[0];

      window.tracker(
        "trackRemoveFromCart",
        (item_id).toString(),
        (item_name || "N/A").toString(),
        (item_category || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        "USD"
      );
    }

    if (
      rawData.payload.event == "ec:setAction" &&
      rawData.payload.playload[0] == "purchase"
    ) {
      const transaction = rawData.payload.playload[1];
      window.tracker(
        "addTrans",
        transaction.id,
        !retailId ? appId : retailId,
        transaction.revenue ?? 0,
        0,
        0,
        "N/A",
        "N/A",
        "USA",
        "USD"
      );
      window.tracker("trackTrans");
    }
  }
  window.addEventListener("message", receiveMessage, false);
};

export default dutchieIframeTracker;
