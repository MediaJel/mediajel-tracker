import { Transactions } from "../../shared/types";
import { tryParseJSONObject } from "../../shared/utils";

const woocommerceTracker = ({
  appId,
  retailId,
}: Pick<Transactions, "appId" | "retailId">) => {
  if (!window.transactionOrder && !window.transactionItems) {
    return;
  }
  const transaction = tryParseJSONObject(window.transactionOrder);
  const products = tryParseJSONObject(window.transactionItems);

  window.tracker(
    "addTrans",
    (transaction.id || transaction.transaction_id).toString(),
    retailId || appId,
    parseFloat(transaction.total),
    parseFloat(transaction.total_tax || 0),
    parseFloat(transaction.shipping_total || 0),
    (transaction.billing.city || "N/A").toString(),
    (transaction.billing.state || "N/A").toString(),
    (transaction.billing.country || "N/A").toString(),
    (transaction.currency || "USD").toString()
  );

  products.forEach(items => {
    const { order_id, name, product_id, total, quantity } = items;

    window.tracker(
      "addItem",
      (transaction.id || order_id).toString(),
      product_id.toString(),
      (name || "N/A").toString(),
      "N/A",    // No Category Field for WooCommerce in transactionItems
      parseFloat(total),
      parseInt(quantity || 1),
      (transaction.currency || "USD").toString()
    );
  })

  window.tracker("trackTrans");
};

export default woocommerceTracker;
