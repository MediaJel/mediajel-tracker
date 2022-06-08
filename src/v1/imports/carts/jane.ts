import { QueryStringContext } from "../../../shared/types";

const janeTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  function receiveMessage(event: MessageEvent<any>) {
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
      window.tracker("trackRemoveFromCart", productId.toString(), "N/A", "N/A", 0, 1, "USD");
    }

    if (payload.name === "checkout") {
      const { customerEmail, products, cartId, estimatedTotal, deliveryFee, deliveryAddress = {city: "N/A", state_code: "N/A", country_code: "N/A"}, salesTax, storeTax } = payload.properties;
      const { city = "N/A", state_code = "N/A", country_code = "N/A" } = deliveryAddress;

      window.tracker("setUserId", customerEmail);

      window.tracker(
        "addTrans",
        cartId.toString(),
        retailId || appId,
        parseFloat(estimatedTotal),
        parseFloat(salesTax + storeTax || 0),
        parseFloat(deliveryFee || 0),
        (city || "N/A").toString(),
        (state_code || "N/A").toString(),
        (country_code || "N/A").toString(),
        "USD"
      );

      products.forEach((items) => {
        const { product_id, name, category, unit_price, count } = items;

        window.tracker(
          "addItem",
          cartId.toString(),
          product_id.toString(),
          (name || "N/A").toString(),
          (category || "N/A").toString(),
          parseFloat(unit_price || 0),
          parseInt(count || 1),
          "USD"
        );
      });

      window.tracker("trackTrans");
    }
  }

  window.addEventListener("message", receiveMessage, false);
};

export default janeTracker;
