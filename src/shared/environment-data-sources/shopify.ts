import observable from "src/shared/utils/create-events-observable";

import { TransactionCartItem } from "../types";

const shopifyDataSource = () => {
  if (!window.transactionOrder) {
    if (!window.Shopify?.checkout) {
      return;
    }
  } else {
    try {
      const transaction = window?.transactionOrder;
      const products = window?.transactionItems;
      observable.notify({
        transactionEvent: {
          id: transaction?.order?.id,
          total: parseFloat(transaction?.totalPrice?.amount || 0),
          tax: parseFloat(transaction?.totalTax?.amount || 0),
          shipping: parseFloat(transaction?.shippingLine?.price?.amount || 0),
          city: "N/A",
          state: "N/A",
          country: "N/A",
          currency: (transaction?.currencyCode || "USD").toString(),
          items: products?.map((product: any) => {
            const productItem = product?.variant;
            return {
              orderId: transaction?.order?.id.toString(),
              productId: product?.id.toString(),
              sku: productItem.sku.toString(),
              name: productItem.product.title.toString(),
              category: "N/A", // No Category Field for Shopify in transactionItems
              unitPrice: parseFloat(productItem.price.amount) || 0,
              quantity: parseInt(product.quantity) || 1,
              currency: (transaction?.currencyCode || "USD").toString(),
            } as TransactionCartItem;
          }),
        },
      });
    } catch (error) {
      // window.tracker("trackError", JSON.stringify(error), "SHOPIFY");
    }
  }

  // liquid_total_price is legacy support for old shopify integration
  if (window.Shopify?.checkout) {
    try {
      const transaction = window.Shopify.checkout;
      const products = transaction.line_items;
      const email = transaction.email || "N/A";
      const orderNumber = document.getElementsByClassName("os-order-number")[0]["innerText"] || "";

      window.tracker("setUserId", email);

      observable.notify({
        transactionEvent: {
          userId: email,
          id: `${(transaction.liquid_order_name || transaction.order_id).toString()} ${
            orderNumber && `- ${orderNumber}`
          }`,
          total: parseFloat(transaction.liquid_total_price || transaction.total_price),
          tax: parseFloat(transaction.total_tax || 0),
          shipping: parseFloat(transaction.shipping_rate.price || 0),
          city: (transaction.billing_address.city || "N/A").toString(),
          discount: parseFloat(transaction.discount || 0),
          couponCode: "N/A", // No Coupon Code field in Shopify Checkout object
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
        },
      });
    } catch (error) {
      // window.tracker("trackError", JSON.stringify(error), "SHOPIFY");
    }
  }
};

export default shopifyDataSource;
