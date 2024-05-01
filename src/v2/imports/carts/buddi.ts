import { errorTrackingSource } from "../../../shared/sources/error-tracking-source";
import { xhrResponseSource } from "../../../shared/sources/xhr-response-source";
import { QueryStringContext } from "../../../shared/types";

const buddiTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  xhrResponseSource((xhr: XMLHttpRequest): void => {
    errorTrackingSource(() => {
      const response = JSON.parse(xhr.responseText);
      const cartList = []; // Creates an empty array to store cart items for comparison with removeFromCart array

      if (xhr.responseURL.includes("cart") && !xhr.response.includes("delete")) {
        const product = response;

        cartList.push(product);

        window.tracker("trackAddToCart", {
          sku: product.id.toString(),
          name: product.name.toString() || "N/A",
          category: "N/A",
          unitPrice: parseFloat(product.price) || 0,
          quantity: parseInt(product.qty) || 1,
          currency: "USD",
        });
      } else if (xhr.responseURL.includes("delete-product-from-cart")) {
        const product = response.items;

        // xhr filters out the items that are being removed from the cart
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
            window.tracker("trackRemoveFromCart", {
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
        const product = transaction.products;

        window.tracker("addTrans", {
          orderId: transaction.id.toString(),
          total: parseFloat(transaction.total), // required
          affiliation: !retailId ? appId : retailId,
          tax: parseFloat(transaction.tax) || 0,
          shipping: parseFloat(transaction.delivery_fee) || 0,
          city: "N/A",
          state: "N/A",
          country: "USA",
          currency: "USD",
        });

        for (let i = 0; i < product.length; ++i) {
          const item = product[i];

          window.tracker("addItem", {
            orderId: transaction.id.toString(),
            sku: item.product_id.toString(),
            name: item.product.name.toString() || "N/A",
            category: item.product.strain_type.toString() || "N/A",
            price: parseFloat(item.price) || 0,
            quantity: parseInt(item.qty) || 1,
            currency: "USD",
          });
        }

        window.tracker("trackTrans");
        cartList.length = 0; // This clears the cartList array
      }
    });
  });
};

export default buddiTracker;
