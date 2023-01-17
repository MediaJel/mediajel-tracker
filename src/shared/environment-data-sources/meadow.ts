import { postMessageSource } from "../sources/post-message-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const meadowTracker = ({ addToCartEvent, removeFromCartEvent, transactionEvent }: Partial<EnvironmentEvents>) => {
  postMessageSource((event: MessageEvent<any>): void => {
    const rawData = event.data;

    if (rawData.type === "ANALYTICS_CART_ADD") {
      const cartData = rawData.payload;
      const product = rawData.payload.product;

      addToCartEvent({
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

      removeFromCartEvent({
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

      transactionEvent({
        id: transaction.id.toString(),
        total: parseFloat(transaction.total),
        tax: parseFloat(transaction.tax) || 0,
        shipping: parseFloat(transaction.delivery_fee) || 0,
        city: "N/A",
        state: "N/A",
        country: "USA",
        currency: "USD",
        items: products.map((product) => {
          const { item_id, item_name, item_category, price, quantity } = product;
          return {
            orderId: transaction.id.toString(),
            productId: item_id.toString(),
            sku: item_id.toString(),
            name: (item_name || "N/A").toString(),
            category: (item_category || "N/A").toString(),
            unitPrice: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          } as TransactionCartItem;
        }),
      });
    }
  });
};

export default meadowTracker;
