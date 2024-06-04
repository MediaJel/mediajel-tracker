import { EnvironmentEvents, TransactionCartItem } from "../types";
const lightspeedTracker = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  if (!window.lightspeedTransaction) return;
  else {
    try {
      const transaction = window.lightspeedTransaction;
      const products = transaction.products;

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
    } catch (error) {
      // window.tracker('trackError', JSON.stringify(error), 'LIGHTSPEED');
    }
  }
};

export default lightspeedTracker;
