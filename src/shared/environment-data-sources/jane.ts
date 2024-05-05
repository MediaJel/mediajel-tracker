import { postMessageSource } from "../sources/post-message-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const janeDataSource = ({ addToCartEvent, removeFromCartEvent, transactionEvent }: Partial<EnvironmentEvents>) => {
  postMessageSource((event: MessageEvent<any>) => {
    try {
      const { payload, messageType } = event.data;

      if (!payload || messageType !== "analyticsEvent") {
        return;
      }
      if (payload.name === "cartItemAdd") {
        const { product, productId } = payload.properties;

        addToCartEvent({
          sku: productId.toString(),
          name: (product.name || "N/A").toString(),
          category: (product.category || "N/A").toString(),
          unitPrice: parseFloat(product.price || 0),
          quantity: parseInt(product.quantity || 1),
          currency: "USD",
        });
      }

      if (payload.name === "cartItemRemoval") {
        const { productId } = payload.properties;

        // Hardcoded because most fields are empty
        removeFromCartEvent({
          sku: productId.toString(),
          name: "N/A",
          category: "N/A",
          unitPrice: 0,
          quantity: 1,
          currency: "USD",
        });
      }
      if (payload.name === "checkout") {
        const {
          customerEmail, // to implement
          products,
          cartId,
          estimatedTotal,
          deliveryFee,
          deliveryAddress = {},
          salesTax,
          storeTax,
        } = payload.properties;

        transactionEvent({
          userId: customerEmail,
          id: cartId.toString(),
          total: parseFloat(estimatedTotal),
          tax: parseFloat(salesTax + storeTax || 0),
          shipping: parseFloat(deliveryFee || 0),
          city: (deliveryAddress?.city || "N/A").toString(),
          state: (deliveryAddress?.state_code || "N/A").toString(),
          country: (deliveryAddress?.country_code || "N/A").toString(),
          currency: "USD",
          items: products.map((product) => {
            const { product_id, name, category, unit_price, count } = product;
            return {
              orderId: cartId.toString(),
              sku: product_id.toString(),
              name: (name || "N/A").toString(),
              category: (category || "N/A").toString(),
              unitPrice: parseFloat(unit_price || 0),
              quantity: parseInt(count || 1),
              currency: "USD",
            } as TransactionCartItem;
          }),
        });
      }
    } catch (error) {
      window.tracker("trackError", error, "JANE");
    }
  });
};

export default janeDataSource;
