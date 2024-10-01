import { datalayerSource } from '../sources/google-datalayer-source';
import { EnvironmentEvents, TransactionCartItem } from '../types';

const sweedDataSource = ({ transactionEvent, removeFromCartEvent, addToCartEvent }: Partial<EnvironmentEvents>) => {
  datalayerSource((data: any): void => {
    if (data.event === "purchase") {
      console.log("Purchase Event: ", data);
      try {
        const transaction = data && data.ecommerce;
        const products = transaction.items;
        const { value, shipping, tax } = transaction;
        const transactionId = transaction && transaction.transaction_id && transaction.transaction_id.toString();
        transactionEvent({
          id: transactionId,
          total: parseFloat(value),
          tax: parseFloat(tax),
          city: "N/A",
          country: "USA",
          currency: "USD",
          shipping: shipping,
          state: "N/A",
          items: products.map((items: any) => {
            const { item_id, item_name, item_category, price, quantity } = items;
            return {
              orderId: transactionId,
              category: item_category,
              currency: "USD",
              name: item_name,
              quantity,
              sku: item_id,
              unitPrice: parseFloat(price) || 0,
            } as TransactionCartItem;
          }),
        });
      } catch (error) {
        console.log("Log Warn Purchase Event: ", error);
      }
    }

    if (data.event === "add_to_cart") {
      try {
        const transaction = data && data.ecommerce;
        const products = transaction?.items[0];

        addToCartEvent?.({
          sku: products?.item_id.toString(),
          name: products?.item_name?.toString() || "N/A",
          category: products?.item_category?.toString() || "N/A",
          unitPrice: parseFloat(products?.price || 0),
          quantity: parseInt(products?.quantity || 1),
          currency: "USD",
        });
      } catch (error) { 
        console.log("Log Warn Add to Cart Event: ", error);
      }
    }

    if (data.event === "remove_from_cart") {
      try {
        const transaction = data && data.ecommerce;
        const products = transaction?.items[0];

        removeFromCartEvent?.({
          sku: products?.item_id.toString(),
          name: products?.item_name?.toString() || "N/A",
          category: products?.item_category?.toString() || "N/A",
          unitPrice: parseFloat(products?.price || 0),
          quantity: parseInt(products?.quantity || 1),
          currency: "USD",
        });
      } catch (error) { 
        console.log("Log Warn Remove from Cart Event: ", error);
      }
    }
  });
};

export default sweedDataSource;
