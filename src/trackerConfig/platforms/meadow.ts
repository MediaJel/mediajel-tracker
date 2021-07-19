import { EcommerceContext } from "../../interface";

export default function meadowTracker(context: EcommerceContext) {
  const { appId, retailId } = context;

  function receiveMessage(event) {
    var rawData = event.data;

    if (rawData.type === "ANALYTICS_CART_ADD") {
      var cartData = rawData.payload;
      var product = rawData.payload.product;
      window.appId(
        "trackAddToCart",
        String(product.id),
        product.name,
        product.primaryCategory.name
          ? product.primaryCategory.name
          : String(product.primaryCategory.id),
        product.option.price / 100,
        cartData.quantity,
        "USD"
      );
    }

    if (rawData.type === "ANALYTICS_CART_REMOVE") {
      var cartData = rawData.payload;
      var product = rawData.payload.product;
      window.appId(
        "trackRemoveFromCart",
        String(product.id),
        product.name,
        product.primaryCategory.name
          ? product.primaryCategory.name
          : String(product.primaryCategory.id),
        product.option.price / 100,
        cartData.quantity,
        "USD"
      );
    }

    if (rawData.type === "ANALYTICS_PURCHASE") {
      var transaction = rawData.payload.order;
      var lineItem = transaction.lineItems;

      window.appId(
        "addTrans",
        String(transaction.id),
        !retailId ? appId : retailId,
        transaction.netPrice / 100,
        transaction.taxesTotal / 100,
        0,
        "N/A",
        "N/A",
        "USA",
        "US"
      );

      for (var i = 0, l = lineItem.length; i < l; i++) {
        var item = lineItem[i].product;
        var quantity = lineItem[i].quantity;

        window.appId(
          "addItem",
          String(transaction.id),
          item.id,
          item.name,
          item.primaryCategory.name
            ? item.primaryCategory.name
            : String(item.primaryCategory.id),
          item.option.price / 100,
          quantity,
          "US"
        );
      }

      window.appId("trackTrans");
    }
  }
  window.addEventListener("message", receiveMessage, false);
}