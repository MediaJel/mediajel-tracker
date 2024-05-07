import { EnvironmentEvents, TransactionCartItem } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

const woocommerceDataSource = ({ transactionEvent }: Pick<EnvironmentEvents, "transactionEvent">) => {
  if (!window.transactionOrder && !window.transactionItems) {
    return;
  }
  
  try {
    const transaction = tryParseJSONObject(window.transactionOrder);
  const products = tryParseJSONObject(window.transactionItems);
  const email = transaction.billing.email || "N/A";

  transactionEvent({
    id: (transaction.id || transaction.transaction_id).toString(),
    total: parseFloat(transaction.total),
    tax: parseFloat(transaction.total_tax || 0),
    shipping: parseFloat(transaction.shipping_total || 0),
    city: (transaction.billing.city || "N/A").toString(),
    state: (transaction.billing.state || "N/A").toString(),
    country: (transaction.billing.country || "N/A").toString(),
    currency: (transaction.currency || "USD").toString(),
    userId: email,
    items: products.map((product) => {
      const { order_id, name, product_id, total, quantity } = product;
      const transactionItemTotal = parseFloat(total) / quantity;

      return {
        orderId: (transaction.id || order_id).toString(),
        sku: product_id.toString(),
        name: (name || "N/A").toString(),
        category: "N/A", // No Category Field for WooCommerce in transactionItems
        unitPrice: transactionItemTotal,
        quantity: parseInt(quantity || 1),
        currency: (transaction.currency || "USD").toString(),
      } as TransactionCartItem;
    }),
  });
  } catch (error) {
    window.tracker('trackError', error, 'WOOCOMMERCE');
  }
};

export default woocommerceDataSource;
