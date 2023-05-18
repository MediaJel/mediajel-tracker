import { errorTrackingSource } from "../../../shared/sources/error-tracking-source";
import { QueryStringContext } from "../../../shared/types";

const shopifyTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  errorTrackingSource(() => {
    if (!window.Shopify.checkout) {
      return;
    }
    const transaction = window.Shopify.checkout;
    const products = transaction.line_items;
    const email = transaction.email || "N/A";
    const orderNumber = document.getElementsByClassName("os-order-number")[0]["innerText"];

    window.tracker("setUserId", email);

    // liquid_total_price is legacy support for old shopify integration
    window.tracker("addTrans", {
      orderId: `${(transaction.liquid_order_name || transaction.order_id).toString()} - ${orderNumber}`,
      affiliation: retailId ?? appId,
      total: parseFloat(transaction.liquid_total_price || transaction.total_price),
      tax: parseFloat(transaction.total_tax || 0),
      shipping: parseFloat(transaction.shipping_rate.price || 0),
      city: (transaction.billing_address.city || "N/A").toString(),
      state: (transaction.billing_address.province || "N/A").toString(),
      country: (transaction.billing_address.country || "N/A").toString(),
      currency: (transaction.currency || "USD").toString(),
    });

    products.forEach((items) => {
      const { id, product_id, title, variant_title, price, quantity } = items;

      window.tracker("addItem", {
        orderId: (transaction.liquid_order_name || transaction.order_id).toString(),
        sku: (id || product_id).toString(),
        name: (title || "N/A").toString(),
        category: (variant_title || "N/A").toString(),
        price: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: (transaction.currency || "USD").toString(),
      });
    });

    window.tracker("trackTrans");
  });
};

export default shopifyTracker;
