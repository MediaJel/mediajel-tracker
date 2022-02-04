import { TagContext } from "../../../shared/types";

const shopifyTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {
  if (!window.Shopify.checkout) {
    return;
  }
  else {
    const transaction = window.Shopify.checkout;
    const products = transaction.line_items;

    // liquid_total_price is legacy support for old shopify integration
    window.tracker(
      "addTrans",
      (transaction.liquid_order_name || transaction.order_id).toString(),
      retailId ?? appId,
      parseFloat(transaction.liquid_total_price || transaction.total_price),
      parseFloat(transaction.total_tax || 0),
      parseFloat(transaction.shipping_rate.price || 0),
      (transaction.billing_address.city || "N/A").toString(),
      (transaction.billing_address.province || "N/A").toString(),
      (transaction.billing_address.country || "N/A").toString(),
      (transaction.currency || "USD").toString()
    );

    products.forEach(items => {
      const { id, product_id, title, variant_title, price, quantity } = items;

      window.tracker(
        "addItem",
        (transaction.liquid_order_name || transaction.order_id).toString(),
        (id || product_id).toString(),
        (title || "N/A").toString(),
        (variant_title || "N/A").toString(),
        parseFloat(price || 0),
        parseInt(quantity || 1),
        (transaction.currency || "USD").toString()
      );
    })

    window.tracker("trackTrans");
  }
};

export default shopifyTracker;
