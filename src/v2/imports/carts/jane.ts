import { postMessageSource } from "../../../shared/sources/post-message-source";
import { QueryStringContext } from "../../../shared/types";

const janeTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  postMessageSource((event: MessageEvent<any>): void => {
    const { payload, messageType } = event.data;

    if (!payload || messageType !== "analyticsEvent") {
      return;
    }

    if (payload.name === "cartItemAdd") {
      const { product, productId } = payload.properties;

      window.tracker("trackAddToCart", {
        sku: productId.toString(),
        name: (product.name || "N/A").toString(),
        category: (product.category || "N/A").toString(),
        unitPrice: parseFloat(product.unit_price || 0),
        quantity: parseInt(product.count || 1),
        currency: "USD",
      });
    }

    if (payload.name === "cartItemRemoval") {
      const { productId } = payload.properties;

      // Hardcoded because most fields are empty
      window.tracker("trackRemoveFromCart", {
        sku: productId.toString(),
        name: "N/A",
        category: "N/A",
        unitPrice: 0,
        quantity: 1,
        currency: "USD",
      });
    }

    if (payload.name === "checkout") {
      const { customerEmail, products, cartId, estimatedTotal, deliveryFee, deliveryAddress, salesTax, storeTax } =
        payload.properties;
      const { city = "N/A", state_code = "N/A", country_code = "N/A" } = deliveryAddress;

      window.tracker("setUserId", customerEmail);

      // TODO: Reconfigure to add deliveryAddress object for city, state_code, and country_code
      window.tracker("addTrans", {
        orderId: cartId.toString(),
        total: parseFloat(estimatedTotal),
        affiliation: retailId || appId,
        tax: parseFloat(salesTax + storeTax || 0),
        shipping: parseFloat(deliveryFee || 0),
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
      });

      products.forEach((items) => {
        const { product_id, name, category, unit_price, count } = items;

        window.tracker("addItem", {
          orderId: cartId.toString(),
          sku: product_id.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          price: parseFloat(unit_price || 0),
          quantity: parseInt(count || 1),
          currency: "USD",
        });
      });

      window.tracker("trackTrans");
    }
  });
};

export default janeTracker;
