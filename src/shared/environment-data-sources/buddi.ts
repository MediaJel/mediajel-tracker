import { EnvironmentEvents, TransactionCartItem } from "../types";
import { xhrResponseSource } from "../sources/xhr-response-source";

const buddiTracker = ({ addToCartEvent, removeFromCartEvent, transactionEvent }: Partial<EnvironmentEvents>): void => {
  xhrResponseSource((xhr: XMLHttpRequest): void => {
    try {
      const response = JSON.parse(xhr.responseText);
      const cartList = [];

      if (xhr.responseURL.includes("cart") && !xhr.response.includes("delete")) {
        const product = response;

        cartList.push(product);

        addToCartEvent({
          sku: product.id.toString(),
          name: product.name.toString() || "N/A",
          category: "N/A",
          unitPrice: parseFloat(product.price) || 0,
          quantity: parseInt(product.qty) || 1,
          currency: "USD",
        });
      } else if (xhr.responseURL.includes("delete-product-from-cart")) {
        const product = response.items;

        const removedItem = cartList
          .filter((x) => {
            !product.includes(x);
          })
          .concat(
            product.filter((x) => {
              !cartList.includes(x);
            })
          );

        try {
          for (let i = removedItem.length; i > 0; i--) {
            removeFromCartEvent({
              sku: removedItem[i - 1].id.toString(),
              name: removedItem[i - 1].name.toString() || "N/A",
              category: "N/A",
              unitPrice: parseFloat(removedItem[i - 1].price) || 0,
              quantity: parseInt(removedItem[i - 1].qty) || 1,
              currency: "USD",
            });

            removedItem.length -= 1;
          }
          removedItem.length = 0;
        } catch {
          return;
        }
      } else if (xhr.responseURL.includes("orders")) {
        const transaction = response;
        const products = transaction.products;

        transactionEvent({
          id: transaction.id.toString(),
          total: parseFloat(transaction.total),
          tax: parseFloat(transaction.tax) || 0,
          shipping: parseFloat(transaction.delivery_fee) || 0,
          city: "N/A",
          state: "N/A",
          country: "USA",
          currency: "USD",
          items: products.map((product) => {
            const { item_id, item_name, item_category, price, quantity } = product;
            return {
              orderId: transaction.id.toString(),
              productId: item_id.toString(),
              sku: item_id.toString(),
              name: (item_name || "N/A").toString(),
              category: (item_category || "N/A").toString(),
              unitPrice: parseFloat(price || 0),
              quantity: parseInt(quantity || 1),
              currency: "USD",
            } as TransactionCartItem;
          }),
        });
      }
    } catch (e) {
      window.tracker("trackError", e, "BUDDI");
    }
  });
};

export default buddiTracker;
