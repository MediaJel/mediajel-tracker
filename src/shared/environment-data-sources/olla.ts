import { datalayerSource } from "../sources/google-datalayer-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const ollaTracker = ({ addToCartEvent, removeFromCartEvent, transactionEvent }: Partial<EnvironmentEvents>) => {
  datalayerSource((data: any): void => {
    try {
      const dataLayerEvent = data[1];
      if (data.event === "add_to_cart" || dataLayerEvent === "add_to_cart") {
        const products = data.items || data[2].items; // data.items is at array index 2
        const { id, name, price, quantity, category } = products[0];

        addToCartEvent({
          sku: id.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          unitPrice: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: "USD",
        });
      }

      if (data.event === "remove_from_cart" || dataLayerEvent === "remove_from_cart") {
        const products = data.items || data[2].items; // data.items is at array index 2
        const { id, name, price, quantity, category } = products[0];

        removeFromCartEvent({
          sku: id.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          unitPrice: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: "USD",
        });
      }

      if (data.event === "purchase" || dataLayerEvent === "purchase") {
        // all ecommerce information is at array index 2
        const transaction_id = data.transaction_id || data[2].transaction_id;
        const transaction_total = data.value || data[2].value;
        const products = data.items || data[2].items;

        transactionEvent({
          id: transaction_id.toString(),
          total: parseFloat(transaction_total),
          tax: 0,
          shipping: 0,
          city: "N/A",
          state: "N/A",
          country: "USA",
          currency: "USD",
          items: products.map((product) => {
            const { item_id, item_name, item_category, price, quantity } = product;
            return {
              orderId: transaction_id.toString(),
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
    } catch (error) {
      window.tracker('trackError', JSON.stringify(error), 'OLLA');
    }
  });
};

export default ollaTracker;
