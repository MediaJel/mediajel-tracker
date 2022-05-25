import { postMessageSource } from "../../../shared/sources/post-message-source";
import { QueryStringContext } from "../../../shared/types";

const meadowTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  postMessageSource((event: MessageEvent<any>): void => {
    const rawData = event.data;

    if (rawData.type === "ANALYTICS_CART_ADD") {
      const cartData = rawData.payload;
      const product = rawData.payload.product;

      window.tracker(
        "trackAddToCart",
        product.id.toString(),
        (product.name || "N/A").toString(),
        (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
        parseFloat(product.option.price || 0) / 100,
        parseInt(cartData.quantity || 1),
        "USD"
      );
    }

    if (rawData.type === "ANALYTICS_CART_REMOVE") {
      const cartData = rawData.payload;
      const product = rawData.payload.product;

      window.tracker(
        "trackRemoveFromCart",
        product.id.toString(),
        (product.name || "N/A").toString(),
        (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
        parseFloat(product.option.price || 0) / 100,
        parseInt(cartData.quantity || 1),
        "USD"
      );
    }

    if (rawData.type === "ANALYTICS_PURCHASE") {
      const transaction = rawData.payload.order;
      const products = transaction.lineItems;

      // Hardcoded because most fields are empty
      window.tracker(
        "addTrans",
        transaction.id.toString(),
        retailId ?? appId,
        parseFloat(transaction.netPrice) / 100,
        parseFloat(transaction.taxesTotal || 0) / 100,
        0,
        "N/A",
        "N/A",
        "N/A",
        "USD"
      );

      products.forEach((items) => {
        const { product, quantity } = items;

        window.tracker(
          "addItem",
          transaction.id.toString(),
          product.id.toString(),
          (product.name || "N/A").toString(),
          (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
          parseFloat(product.option.price || 0) / 100,
          parseInt(quantity || 1),
          "USD"
        );
      });

      window.tracker("trackTrans");
    }
  });
};

export default meadowTracker;
