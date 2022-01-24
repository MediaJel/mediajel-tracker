import { TagContext } from "../../../shared/types";

const woocommerceTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {
  try {
    if (!window.transactionOrder && !window.transactionItems) return;
    const transaction = JSON.parse(window.transactionOrder);
    const products = JSON.parse(window.transactionItems);

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

    for (let i = 0; i < products.length; ++i) {
      window.tracker(
        "addItem",
        (transaction.id || products[i].order_id).toString(),
        products[i].product_id.toString(),
        (products[i].name || "N/A").toString(),
        (products[i].category || "N/A").toString(),
        parseFloat(products[i].total),
        parseInt(products[i].quantity || 1),
        (transaction.currency || "USD").toString()
      );
    }

    window.tracker("trackTrans");
  }
  catch {
    console.error("Error in woocommerceTracker");
    return; 
  }
};

export default woocommerceTracker;
