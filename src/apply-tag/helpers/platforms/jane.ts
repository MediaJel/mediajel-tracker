import { TagContext } from "../../../shared/types";

const janeTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {
  function receiveMessage(event) {
    const { payload, messageType } = event.data;

    if (!payload || messageType !== "analyticsEvent") {
      return;
    }

    if (payload.name === "cartItemAdd") {
      const { product, productId } = payload.properties;
      
      window.tracker(
        "trackAddToCart",
        productId.toString(),
        (product.name || "N/A").toString(),
        (product.category || "N/A").toString(),
        parseFloat(product.unit_price || 0),
        parseInt(product.count || 1),
        "USD"
      );
    }

    if (payload.name === "cartItemRemoval") {
      const { productId } = payload.properties;

      // Hardcoded because most fields are empty
      window.tracker(
        "trackRemoveFromCart",
        productId.toString(),
        "N/A",
        "N/A",
        0,
        1,
        "USD"
      );
    }

    if (payload.name === "checkout") {
      const { products, cartId, estimatedTotal, deliveryFee, deliveryAddress, salesTax, storeTax } = payload.properties;
      
      window.tracker(
        "addTrans",
        cartId.toString(),
        retailId || appId,
        parseFloat(estimatedTotal),
        parseFloat(salesTax + storeTax || 0),
        parseFloat(deliveryFee || 0),
        (deliveryAddress.city || "N/A").toString(),
        (deliveryAddress.state_code || "N/A").toString(),
        (deliveryAddress.country_code || "N/A").toString(),
        "USD"
      );

      for (let i = 0; i < products.length; ++i) {
        window.tracker(
          "addItem",
          cartId.toString(),
          (products[i].product_id).toString(),
          (products[i].name || "N/A").toString(),
          (products[i].category || "N/A").toString(),
          parseFloat(products[i].unit_price || 0),
          parseInt(products[i].count || 1),
          "USD"
        );
      }

      window.tracker("trackTrans");
    }
  }
  
  window.addEventListener("message", receiveMessage, false);
};

export default janeTracker;