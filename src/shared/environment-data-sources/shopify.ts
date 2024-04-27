import { EnvironmentEvents, TransactionCartItem } from "../types";

const shopifyDataSource = ({ transactionEvent }: Pick<EnvironmentEvents, "transactionEvent">) => {
  if (!window.Shopify.checkout) {
    return;
  }

  const transaction = window.Shopify.checkout;
  const products = transaction.line_items;
  const email = transaction.email || "N/A";
  const orderNumber = document.getElementsByClassName("os-order-number")[0]["innerText"] || "";

  window.tracker("setUserId", email);

  // liquid_total_price is legacy support for old shopify integration

  transactionEvent({
    userId: email,
    id: `${(transaction.liquid_order_name || transaction.order_id).toString()} ${orderNumber && `- ${orderNumber}`}`,
    total: parseFloat(transaction.liquid_total_price || transaction.total_price),
    tax: parseFloat(transaction.total_tax || 0),
    shipping: parseFloat(transaction.shipping_rate.price || 0),
    city: (transaction.billing_address.city || "N/A").toString(),
    state: (transaction.billing_address.province || "N/A").toString(),
    country: (transaction.billing_address.country || "N/A").toString(),
    currency: (transaction.currency || "N/A").toString(),
    items: products.map((product: any) => {
      const { id, product_id, title, variant_title, price, quantity } = product;
      return {
        orderId: (transaction.liquid_order_name || transaction.order_id).toString(),
        productId: (id || product_id).toString(),
        sku: (id || product_id).toString(),
        name: (title || "N/A").toString(),
        category: "N/A", // No Category Field for Shopify in transactionItems
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: (transaction.currency || "USD").toString(),
      } as TransactionCartItem;
    }),
  });
};

export default shopifyDataSource;
