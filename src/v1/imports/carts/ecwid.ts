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

  window.tracker(
    "addTrans",
    transaction.orderNumber.toString(),
    retailId || appId,
    parseFloat(orderTotal),
    transactionTax,
    parseFloat(orderShippingCost || 0),
    "N/A", // TODO: GET BILLING/SHIPPING ADDRESSES FOR ECWID
    "N/A",
    "N/A",
    "USD"
  );

  products.forEach((items) => {
    const { orderItemName, orderItemSku, orderItemPrice, orderItemQuantity } = items;
    const itemPrice = orderItemPrice.substring(1);

    window.tracker(
      "addItem",
      transaction.orderNumber.toString(),
      orderItemSku.toString(),
      (orderItemName || "N/A").toString(),
      "N/A", // No Category Field for Ecwid in transactionItems
      parseFloat(itemPrice || 0),
      parseInt(orderItemQuantity || 1),
      "USD"
    );
  });

  window.tracker("trackTrans");
};

export default ecwidTracker;
