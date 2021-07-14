import checkJsonString from "../utils/parseJson";

export default function dutchieTracker(appId) {
  const clientAppId = appId;

  function receiveMessage(event) {
    const rawData = checkJsonString(event.data);

    if (!rawData) return;

    if (rawData.payload.event === "ec:addProduct") {
      const cartArray = rawData.payload.playload;
      for (let i = 0, l = cartArray.length; i < l; i += 1) {
        const cartItem = cartArray[i];
        window.clientAppId(
          "trackAddToCart",
          cartItem.id,
          cartItem.name,
          cartItem.category,
          cartItem.price,
          cartItem.quantity,
          "USD"
        );
      }
    }
    if (
      rawData.payload.event === "ec:setAction" &&
      rawData.payload.playload[0] === "purchase"
    ) {
      const transaction = rawData.payload.playload[1];
      window.clientAppId(
        "addTrans",
        transaction.id,
        `${clientAppId}`,
        transaction.revenue,
        0,
        0,
        "N/A",
        "N/A",
        "USA",
        "USD"
      );
      Iindow.clientAppId("trackTrans");
    }
  }

  window.addEventListener("message", receiveMessage, false);
}
