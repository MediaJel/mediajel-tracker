import { QueryStringContext } from "../../../shared/types";
import { tryParseJSONObject } from "../../../shared/utils/try-parse-json";

const ecwidTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  if (!window.transactionOrder && !window.transactionItems) {
    return;
  }
  const transaction = tryParseJSONObject(window.transactionOrder);
  const products = tryParseJSONObject(window.transactionItems);
  const tax = transaction.taxes.reduce((total, tax) => total + parseFloat(tax.value), 0);

  if (window.email) {
    const email = window.email || "N/A";
    window.tracker("setUserId", email);
  }

  window.tracker(
    "addTrans",
    transaction.number.toString(),
    retailId || appId,
    parseFloat(transaction.total),
    parseFloat(tax || 0),
    parseFloat(transaction.shippingCost || 0),
    (transaction.shippingAddress.city || "N/A").toString(),
    (transaction.billing.state || "N/A").toString(),
    (transaction.billing.country || "N/A").toString(),
    "USD"
  );

  products.forEach((items) => {
    const { name, sku, price, quantity } = items;

    window.tracker(
      "addItem",
      transaction.id.toString(),
      sku.toString(),
      (name || "N/A").toString(),
      "N/A", // No Category Field for Ecwid in transactionItems
      parseFloat(price),
      parseInt(quantity || 1),
      "USD"
    );
  });

  window.tracker("trackTrans");
};

export default ecwidTracker;
