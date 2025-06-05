import observable from "src/shared/utils/create-events-observable";

import { TransactionCartItem } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

const woocommerceDataSource = () => {
  if (!window.transactionOrder && !window.transactionItems) {
    return;
  }

  try {
    const transaction = tryParseJSONObject(window.transactionOrder);
    const products = tryParseJSONObject(window.transactionItems);
    const email = transaction.billing.email || "N/A";

    observable.notify({
      enhancedTransactionEvent: {
        ids: [(transaction.id || transaction.transaction_id).toString()],
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
      },
    });
  } catch (error) {
    // window.tracker('trackError', JSON.stringify(error), 'WOOCOMMERCE');
  }
};

export default woocommerceDataSource;
