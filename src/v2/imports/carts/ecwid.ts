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

  window.tracker("addTrans", {
    orderId: transaction.number.toString(),
    affiliation: retailId || appId,
    total: parseFloat(transaction.total),
    tax: parseFloat(tax || 0),
    shipping: parseFloat(transaction.shippingCost || 0),
    city: (transaction.shippingAddress.city || "N/A").toString(),
    state: (transaction.billing.state || "N/A").toString(),
    country: (transaction.billing.country || "N/A").toString(),
    currency: "USD",
  });

  products.forEach((items) => {
    const { name, sku, price, quantity } = items;

    window.tracker("addItem", {
      orderId: transaction.number.toString(),
      sku: sku.toString(),
      name: (name || "N/A").toString(),
      category: "N/A", // No Category Field for Ecwid in transactionItems
      unitPrice: parseFloat(price),
      quantity: parseInt(quantity || 1),
      currency: "USD",
    });
  });

  window.tracker("trackTrans");
};

export default ecwidTracker;
