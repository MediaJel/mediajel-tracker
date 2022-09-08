import { QueryStringContext } from "../../../shared/types";
import { tryParseJSONObject } from "../../../shared/utils/try-parse-json";

const ecwidTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  if (!window.transactionOrder && !window.transactionItems) {
    return;
  }
  const transaction = tryParseJSONObject(window.transactionOrder);
  const products = tryParseJSONObject(window.transactionItems);
  
  const orderTotal = transaction.orderTotal.substring(1);
  const orderSubtotalWithoutTax = transaction.orderSubtotalWithoutTax.substring(1);
  const orderSubtotal = transaction.orderSubtotal.substring(1); // just in case for future use
  const orderShippingCost = transaction.orderShippingCost.substring(1);
  const transactionTax = Math.abs(orderTotal - orderSubtotalWithoutTax);

  if (window.transactionEmail) {
    const email = window.transactionEmail || "N/A";
    window.tracker("setUserId", (email).toString());
  }

  window.tracker("addTrans", {
    orderId: transaction.orderNumber.toString(),
    affiliation: retailId || appId,
    total: parseFloat(orderTotal),
    tax: transactionTax,
    shipping: parseFloat(orderShippingCost || 0),
    city: "N/A", // TODO: GET BILLING/SHIPPING ADDRESSES FOR ECWID
    state: "N/A",
    country: "N/A",
    currency: "USD",
  });

  products.forEach((items) => {
    const { orderItemName, orderItemSku, orderItemPrice, orderItemQuantity } = items;
    const itemPrice = orderItemPrice.substring(1);

    window.tracker("addItem", {
      orderId: transaction.orderNumber.toString(),
      sku: orderItemSku.toString(),
      name: (orderItemName || "N/A").toString(),
      category: "N/A", // No Category Field for Ecwid in transactionItems
      unitPrice: parseFloat(itemPrice || 0),
      quantity: parseInt(orderItemQuantity || 1),
      currency: "USD",
    });
  });

  window.tracker("trackTrans");
};

export default ecwidTracker;
