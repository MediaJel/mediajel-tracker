import { EcommerceContext } from "../../interface";

export default function tymberTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  function receiveMessage(event) {
    const { data, name } = event.data;

    if (!data || name !== "datalayer.push") {
      return;
    }
    const ecommerce = data.model.ecommerce;
    const actionField = ecommerce.actionField;
    const products = ecommerce.products;

    if (data.model.event === "purchase") {
      const { id, revenue, tax } = actionField;
      window.appId(
        "addTrans",
        id.toString(),
        !retailId ? appId : retailId,
        revenue,
        tax ? tax : 0,
        0,
        "N/A",
        "California",
        "USA",
        "USD"
      );

      for (let i = 0, l = products.length; i < l; i += 1) {
        const item = products[i];
        window.appId(
          "addItem",
          actionField.id,
          item.id,
          item.name,
          item.category,
          item.price,
          item.quantity
        );
      }
      window.appId("trackTrans");
    }

    if (data.model.event === "addToCart") {
      const { category, id, name, price, quantity } = ecommerce.add.products[0];
      window.appId(
        "trackAddToCart",
        id.toString(),
        name ? name : "N/A",
        category ? category : "N/A",
        price ? price : 0,
        quantity ? quantity : 1,
        ecommerce.currencyCode ? ecommerce.currencyCode : "USD"
      );
    }

    if (data.model.event === "removeFromCart") {
      const { category, id, name, price, quantity } =
        ecommerce.remove.products[0];
      window.appId(
        "trackRemoveFromCart",
        id.toString(),
        name ? name : "N/A",
        category ? category : "N/A",
        price ? price : 0,
        quantity ? quantity : 1,
        ecommerce.currencyCode ? ecommerce.currencyCode : "USD"
      );
    }
  }
  window.addEventListener("message", receiveMessage, false);
}
