import { xhrSource } from "../../../shared/sources/xhr-source";
import { QueryStringContext } from "../../../shared/types";

const buddiTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  xhrSource((xhr: XMLHttpRequest): void => {
    try {
      const response = JSON.parse(xhr.responseText);
      const cartList = []; // Creates an empty array to store cart items for comparison with removeFromCart array

      if (xhr.responseURL.includes("cart") && !xhr.response.includes("delete")) {
        const product = response;

        cartList.push(product);
        console.log("cartList: " + cartList);
        window.tracker(
          "trackAddToCart",
          product.id.toString(),
          (product.name || "N/A").toString(),
          "N/A",
          parseFloat(product.price || 0),
          parseInt(product.qty || 1),
          "USD"
        );
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

        console.log("removedItem: " + JSON.stringify(removedItem));
        try {
          for (let i = removedItem.length; i > 0; i--) {
            window.tracker(
              "trackRemoveFromCart",
              removedItem[i - 1].id.toString(),
              (removedItem[i - 1].name || "N/A").toString(),
              "N/A",
              parseFloat(removedItem[i - 1].price || 0),
              parseInt(removedItem[i - 1].qty || 1),
              "USD"
            );
            removedItem.length -= 1;
          }
          removedItem.length = 0;
        } catch {
          return;
        }
      } else if (xhr.responseURL.includes("orders")) {
        const transaction = response;
        const product = transaction.products;

        window.tracker(
          "addTrans",
          transaction.id.toString(),
          !retailId ? appId : retailId,
          parseFloat(transaction.total),
          parseFloat(transaction.tax || 0),
          parseFloat(transaction.delivery_fee || 0),
          "N/A",
          "N/A",
          "USA",
          "US"
        );

        for (let i = 0; i < product.length; ++i) {
          const item = product[i];

          window.tracker(
            "addItem",
            transaction.id.toString(),
            item.product_id.toString(),
            (item.product.name || "N/A").toString(),
            (item.product.strain_type || "N/A").toString(),
            parseFloat(item.price || 0),
            parseInt(item.qty || 1),
            "USD"
          );
        }

        window.tracker("trackTrans");
        cartList.length = 0; // This clears the cartList array
      }
    } catch {
      return;
    }
  });
};

export default buddiTracker;
