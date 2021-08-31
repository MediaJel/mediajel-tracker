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
      const { orderCity, orderState, orderCountry, currencyCode } = ecommerce;

      window.tracker(
        "addTrans",
        id.toString(),
        !retailId ? appId : retailId,
        revenue,
        tax ? tax : 0,
        0,
        orderCity ? orderCity : "N/A",
        orderState ? orderState : "California",
        orderCountry ? orderCountry : "USA",
        currencyCode ? currencyCode : "USD"
      );

      for (let i = 0, l = products.length; i < l; i += 1) {
        const item = products[i];
        window.tracker(
          "addItem",
          actionField.id,
          item.id,
          item.name,
          !item.category ? item.brand : item.category,
          item.price,
          item.quantity,
          ecommerce.currencyCode ? ecommerce.currencyCode : "USD"
        );
      }
      window.tracker("trackTrans");
    }

    if (data.model.event === "addToCart") {
      const { category, id, name, price, quantity } = ecommerce.add.products[0];
      window.tracker(
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
      const { category, id, name, price, quantity } = ecommerce.remove.products[0];
      window.tracker(
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
