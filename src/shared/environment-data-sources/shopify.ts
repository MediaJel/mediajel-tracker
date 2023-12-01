import { EnvironmentEvents, TransactionCartItem } from "../types";

const shopifyDataSource = ({ transactionEvent }: Pick<EnvironmentEvents, "transactionEvent">) => {
  if (!window.Shopify.checkout) {
    return;
  }

  try {
    analytics.subscribe("checkout_completed", (event) => {
      try {
        const products = event.data.checkout;
        const lineItems = products.lineItems;
        window.tracker(
          "addTrans",
          products.order.id,
          "N/A",
          parseFloat(products.totalPrice.amount),
          parseFloat(products.totalTax.amount) || 0,
          parseFloat(products.shippingLine.price.amount) || 0,
          "N/A",
          "N/A",
          "N/A",
          products.currencyCode || "USD"
        );
        lineItems.forEach(function (item) {
          const productItem = item.variant;

          window.tracker(
            "addItem",
            item.id,
            productItem.sku || "N/A",
            productItem.product.title || "N/A",
            "N/A",
            parseFloat(productItem.price.amount) || 0,
            parseInt(item.quantity) || 1,
            products.currencyCode || "USD"
          );
        });
        window.tracker("trackTrans");
      } catch (error) {}
    });
  } catch (error) {}

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
      return {} as TransactionCartItem;
    }),
  });

  products.forEach((items) => {
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
  });

  window.tracker("trackTrans");
};

export default shopifyDataSource;
