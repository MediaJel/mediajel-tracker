import { errorTrackingSource } from "../../../shared/sources/error-tracking-source";
import { postMessageSource } from "../../../shared/sources/post-message-source";
import { QueryStringContext } from "../../../shared/types";

const meadowTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  postMessageSource((event: MessageEvent<any>): void => {
    errorTrackingSource(() => {
      const rawData = event.data;

      if (rawData.type === "ANALYTICS_CART_ADD") {
        const cartData = rawData.payload;
        const product = rawData.payload.product;

        window.tracker("trackAddToCart", {
          sku: product.id.toString(),
          name: (product.name || "N/A").toString(),
          category: (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
          unitPrice: parseFloat(product.option.price || 0) / 100,
          quantity: parseInt(cartData.quantity || 1),
          currency: "USD",
        });
      }

      if (rawData.type === "ANALYTICS_CART_REMOVE") {
        const cartData = rawData.payload;
        const product = rawData.payload.product;

        window.tracker("trackRemoveFromCart", {
          sku: product.id.toString(),
          name: (product.name || "N/A").toString(),
          category: (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
          unitPrice: parseFloat(product.option.price || 0) / 100,
          quantity: parseInt(cartData.quantity || 1),
          currency: "USD",
        });
      }

      if (rawData.type === "ANALYTICS_PURCHASE") {
        const transaction = rawData.payload.order;
        const products = transaction.lineItems;

        // Hardcoded because most fields are empty
        window.tracker("addTrans", {
          orderId: transaction.id.toString(),
          affiliation: retailId ?? appId,
          total: parseFloat(transaction.netPrice) / 100,
          tax: parseFloat(transaction.taxesTotal || 0) / 100,
          shipping: 0,
          city: "N/A",
          state: "N/A",
          country: "N/A",
          currency: "USD",
        });

        products.forEach((items) => {
          const { product, quantity } = items;

          window.tracker("addItem", {
            orderId: transaction.id.toString(),
            sku: product.id.toString(),
            name: (product.name || "N/A").toString(),
            category: (product.primaryCategory.name || product.primaryCategory.id || "N/A").toString(),
            price: parseFloat(product.option.price || 0) / 100,
            quantity: parseInt(quantity || 1),
            currency: "USD",
          });
        });

        window.tracker("trackTrans");
      }
    });
  });
};

export default meadowTracker;
