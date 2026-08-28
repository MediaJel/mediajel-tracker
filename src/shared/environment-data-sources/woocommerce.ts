import logger from "src/shared/logger";
import observable from "src/shared/utils/create-events-observable";

import { TransactionCartItem } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

// window.transactionOrder arrives in two shapes: the REST API order (billing.*,
// total_tax, shipping_total) and a flattened one (tax, shipping, no billing).
// Reads tolerate both; the REST `shipping` is an address object, hence || 0.
const woocommerceDataSource = () => {
  if (!window.transactionOrder) {
    return;
  }

  try {
    const transaction = tryParseJSONObject(window.transactionOrder);
    const products = tryParseJSONObject(window.transactionItems);
    
    if (!Array.isArray(products)) {
      return;
    }
    
    const total = parseFloat(transaction.total);
    if (Number.isNaN(total)) {
      logger.error("WooCommerce: unparseable transaction total", transaction.total);
      return;
    }
    // Order key varies: id, transaction_id, or customer-facing number. Without
    // one the event can't be deduped or joined — skip and log, don't throw.
    const transactionId =
      transaction.id ?? transaction.transaction_id ?? transaction.number;
    if (transactionId === undefined || transactionId === null) {
      logger.error("WooCommerce: transaction payload has no order id", transaction);
      return;
    }
    const email = transaction.billing?.email || "N/A";
    const currency = (transaction.currency || "USD").toString();

    observable.notify({
      transactionEvent: {
        id: transactionId.toString(),
        total,
        tax: parseFloat(transaction.total_tax || transaction.tax) || 0,
        shipping: parseFloat(transaction.shipping_total || transaction.shipping) || 0,
        city: (transaction.billing?.city || "N/A").toString(),
        state: (transaction.billing?.state || "N/A").toString(),
        country: (transaction.billing?.country || "N/A").toString(),
        currency,
        userId: email,
        items: products.map((product) => {
          const { name, product_id, sku, total, quantity } = product;
          // Divide by the float quantity so fractional lines keep the true
          // unit price; a parseable zero stays zero, not a phantom unit.
          const parsedQuantity = parseInt(quantity);
          const itemQuantity = Number.isNaN(parsedQuantity) ? 1 : parsedQuantity;

          return {
            orderId: transactionId.toString(),
            sku: (product_id || sku).toString(),
            name: (name || "N/A").toString(),
            category: "N/A", // No Category Field for WooCommerce in transactionItems
            unitPrice: (parseFloat(total) || 0) / (parseFloat(quantity) || 1),
            quantity: itemQuantity,
            currency,
          } as TransactionCartItem;
        }),
      },
    });
  } catch (error) {
    logger.error("WooCommerce: failed to emit transaction", error);
  }
};

export default woocommerceDataSource;
