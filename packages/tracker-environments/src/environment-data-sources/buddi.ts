import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import observable from "@mediajel/tracker-core/utils/create-events-observable";

import { xhrResponseSource } from "@mediajel/tracker-core/sources/xhr-response-source";
import { TransactionCartItem } from "@mediajel/tracker-core/types";
import { xhrJsonObject } from "@mediajel/tracker-core/utils/xhr-json";

const buddiDataSource = (): void => {
  xhrResponseSource((xhr: XMLHttpRequest): void => {
    const response = xhrJsonObject(xhr);
    if (!response) return;
    const cartList: any[] = [];

    if (xhr.responseURL.includes("cart") && !xhr.response.includes("delete")) {
      // Cart summaries and counts share this URL pattern; only a product
      // payload (it carries an id) is an add-to-cart. Skip the rest silently.
      if (response.id == null) return;
      const product = response;

      cartList.push(product);

      observable.notify({
        addToCartEvent: {
          sku: product.id.toString(),
          name: (product.name ?? "N/A").toString(),
          category: "N/A",
          unitPrice: parseFloat(product.price) || 0,
          quantity: parseInt(product.qty) || 1,
          currency: "USD",
        },
      });
    } else if (xhr.responseURL.includes("delete-product-from-cart")) {
      const product = response.items;
      if (!Array.isArray(product)) return;

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
          observable.notify({
            removeFromCartEvent: {
              sku: removedItem[i - 1].id.toString(),
              name: removedItem[i - 1].name.toString() || "N/A",
              category: "N/A",
              unitPrice: parseFloat(removedItem[i - 1].price) || 0,
              quantity: parseInt(removedItem[i - 1].qty) || 1,
              currency: "USD",
            },
          });

          removedItem.length -= 1;
        }
        removedItem.length = 0;
      } catch {
        return;
      }
    } else if (xhr.responseURL.includes("orders")) {
      // Order lists and status polls share this URL pattern; only an order
      // with a product list is a transaction. Skip the rest silently.
      const transaction = response;
      if (transaction.id == null || !Array.isArray(transaction.products)) return;
      try {
        const products = transaction.products;

        observable.notify({
          transactionEvent: {
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
          },
        });
      } catch (e) {
        notifyError(e, "buddi");
      }
    }
  });
};

export default buddiDataSource;
