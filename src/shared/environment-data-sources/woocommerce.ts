import observable from "src/shared/utils/create-events-observable";

import { TransactionCartItem } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

// window.transactionOrder arrives in two shapes: the WooCommerce REST API
// order (billing.*, total_tax, shipping_total) and a flattened shape with no
// billing object (tax, shipping). Field reads must tolerate both. Note the
// REST shape's `shipping` is an address object — parseFloat(...) || 0 keeps
// it from leaking through as NaN.
const woocommerceDataSource = () => {
  if (!window.transactionOrder) {
    return;
  }

  try {
    const transaction = tryParseJSONObject(window.transactionOrder);
    const products = tryParseJSONObject(window.transactionItems);
    const email = transaction.billing?.email || "N/A";

    observable.notify({
      transactionEvent: {
        id: (transaction.id || transaction.transaction_id).toString(),
        total: parseFloat(transaction.total) || 0,
        tax: parseFloat(transaction.total_tax || transaction.tax) || 0,
        shipping: parseFloat(transaction.shipping_total || transaction.shipping) || 0,
        city: (transaction.billing?.city || "N/A").toString(),
        state: (transaction.billing?.state || "N/A").toString(),
        country: (transaction.billing?.country || "N/A").toString(),
        currency: (transaction.currency || "USD").toString(),
        userId: email,
        items: (Array.isArray(products) ? products : []).map((product) => {
          const { order_id, name, product_id, sku, total, quantity } = product;
          const itemQuantity = parseInt(quantity) || 1;

          return {
            orderId: (transaction.id || order_id).toString(),
            sku: (sku || product_id).toString(),
            name: (name || "N/A").toString(),
            category: "N/A", // No Category Field for WooCommerce in transactionItems
            unitPrice: (parseFloat(total) || 0) / itemQuantity,
            quantity: itemQuantity,
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
