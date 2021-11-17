import { EcommerceContext } from "../helpers/interface";

export default function dutchieSubdomainTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  function receiveMessage(event) {
    const { data, name } = event.data;

    if (!data || name !== "datalayer.push") {
      return;
    }
    const ecommerce = data.model.ecommerce;
    const products = ecommerce.items;

    if (data.model.event === "purchase") {
      const { transaction_id, value } = ecommerce;
      window.tracker(
        "addTrans",
        transaction_id.toString(),
        !retailId ? appId : retailId,
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
        window.tracker(
          "addItem",
          ecommerce.transaction_id,
          item.item_id,
          item.item_name,
          item.item_category,
          item.price,
          item.quantity
        );
      }
      window.tracker("trackTrans");
    }

    if (data.model.event === "add_to_cart") {
      const { item_category, item_id, item_name, price, quantity } = products;
      window.tracker(
        "trackAddToCart",
        item_id.toString(),
        item_name ? item_name : "N/A",
        item_category ? item_category : "N/A",
        price ? price : 0,
        quantity ? quantity : 1,
        "USD"
      );
    }

    if (data.model.event === "remove_from_cart") {
      const { item_category, item_id, item_name, price, quantity } = products;
      window.tracker(
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
