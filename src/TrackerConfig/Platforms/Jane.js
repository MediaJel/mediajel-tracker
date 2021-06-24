export default function JaneTracker(aid) {
  const mediajelAppId = aid;
  // Ecommerce tracking

  function receiveMessage(event) {
    const { payload, messageType } = event.data;

    if (!payload || messageType !== "analyticsEvent") return;

    if (payload.name === "checkout") {
      const { products, cartId, estimatedTotal } = payload.properties;
      window.mediajelAppId(
        "addTrans",
        cartId,
        `${mediajelAppId}`,
        estimatedTotal,
        "0",
        "0",
        "N/A",
        "California",
        "USA"
      );

      for (let i = 0, l = products.length; i < l; i += 1) {
        const item = products[i];

        window.mediajelAppId(
          "addItem",
          cartId,
          item.product_id,
          item.name,
          item.category,
          item.unit_price,
          item.count
        );
      }

      window.mediajelAppId("trackTrans");
    }
    if (payload.name === "cartItemAdd") {
      const { product, productId } = payload.properties;
      window.mediajelAppId(
        "trackAddToCart",
        productId.toString(),
        product.name,
        product.category,
        product.unit_price ?? 0,
        product.count ?? 1,
        "USD"
      );
    }
    if (payload.name === "cartItemRemoval") {
      const { productId } = payload.properties;

      window.mediajelAppId(
        "trackRemoveFromCart",
        productId.toString(),
        "N/A",
        "N/A",
        0,
        1,
        "USD"
      );
    }
  }
  window.addEventListener("message", receiveMessage, false);
}
