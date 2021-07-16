export default function dutchieSubdomainTracker(appId, retailId) {
  const clientAppId = appId;

  function receiveMessage(event) {
    const { data, name } = event.data;

    if (!data || name !== "datalayer.push") {
      return;
    }
    const ecommerce = data.model.ecommerce;
    const products = ecommerce.items;

    if (data.model.event === "purchase") {
      const { transaction_id, value } = ecommerce;
      window.clientAppId(
        "addTrans",
        transaction_id.toString(),
        !retailId ? clientAppId : retailId,
        value,
        0,
        0,
        "N/A",
        "California",
        "USA",
        "USD"
      );

      for (let i = 0, l = products.length; i < l; i += 1) {
        const item = products[i];
        window.clientAppId(
          "addItem",
          ecommerce.transaction_id,
          item.item_id,
          item.item_name,
          item.item_category,
          item.price,
          item.quantity
        );
      }
      window.clientAppId("trackTrans");
    }

    if (data.model.event === "addToCart") {
      const { item_category, item_id, item_name, price, quantity } = products;
      window.clientAppId(
        "trackAddToCart",
        item_id.toString(),
        item_name ? item_name : "N/A",
        item_category ? item_category : "N/A",
        price ? price : 0,
        quantity ? quantity : 1,
        "USD"
      );
    }

    if (data.model.event === "removeFromCart") {
      const { item_category, item_id, item_name, price, quantity } = products;
      window.clientAppId(
        "trackRemoveFromCart",
        item_id.toString(),
        item_name ? item_name : "N/A",
        item_category ? item_category : "N/A",
        price ? price : 0,
        quantity ? quantity : 1,
        "USD"
      );
    }
  }
  window.addEventListener("message", receiveMessage, false);
}
