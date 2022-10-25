import { errorTrackingSource } from "../../../shared/sources/error-tracking-source";
import { QueryStringContext } from "../../../shared/types";
import { tryParseJSONObject } from "../../../shared/utils/try-parse-json";

const woocommerceTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  errorTrackingSource(() => {
    if (!window.transactionOrder && !window.transactionItems) {
      return;
    }
    const transaction = tryParseJSONObject(window.transactionOrder);
    const products = tryParseJSONObject(window.transactionItems);
    const email = transaction.billing.email || "N/A";

    window.tracker("setUserId", email);

    window.tracker("addTrans", {
      orderId: (transaction.id || transaction.transaction_id).toString(),
      affiliation: retailId || appId,
      total: parseFloat(transaction.total),
      tax: parseFloat(transaction.total_tax || 0),
      shipping: parseFloat(transaction.shipping_total || 0),
      city: (transaction.billing.city || "N/A").toString(),
      state: (transaction.billing.state || "N/A").toString(),
      country: (transaction.billing.country || "N/A").toString(),
      currency: (transaction.currency || "USD").toString(),
    });

    products.forEach((items) => {
      const { order_id, name, product_id, total, quantity } = items;

      window.tracker("addItem", {
        orderId: (transaction.id || order_id).toString(),
        sku: product_id.toString(),
        name: (name || "N/A").toString(),
        category: "N/A", // No Category Field for WooCommerce in transactionItems
        unitPrice: parseFloat(total),
        quantity: parseInt(quantity || 1),
        currency: (transaction.currency || "USD").toString(),
      });
    });

    window.tracker("trackTrans");
  });
};

export default woocommerceTracker;
