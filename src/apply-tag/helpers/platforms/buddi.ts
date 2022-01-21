import { TagContext } from "../../../shared/types";

const buddiTracker = ({
  appId,
  retailId,
}: Pick<TagContext, "appId" | "retailId">) => {
  (function () {
    const origOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function () {
      this.addEventListener("load", function () {
        try {
          const response = JSON.parse(this.responseText);
          const cartList = []; // Creates an empty array to store cart items for comparison with removeFromCart array
        
          if (
            this.responseURL.includes("cart") &&
            !this.response.includes("delete")
          ) {
            const product = response;
            
            cartList.push(product);
            console.log(cartList);
            window.tracker(
              "trackAddToCart",
              product.id.toString(),
              (product.name || "N/A").toString(),
              "N/A",
              parseFloat(product.price || 0),
              parseInt(product.qty || 1),
              "USD"
            );
          } 
          else if (this.responseURL.includes("delete-product-from-cart")) {
            const product = response.items;

            // This filters out the items that are being removed from the cart
            const removedItem = cartList.filter(x => {
              !product.includes(x);
            }).concat(product.filter(x => {
              !cartList.includes(x);
            }));
            
            console.log("removedItem: " + removedItem);
            window.tracker(
              "trackRemoveFromCart",
              removedItem.id.toString(),
              (removedItem.name || "N/A").toString(),
              "N/A",
              parseFloat(removedItem.price || 0),
              parseInt(removedItem.qty || 1),
              "USD"
            );
          } 
          else if (this.responseURL.includes("orders")) {
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
                (item.product_id || "N/A").toString(),
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
        }
        catch { return; }
        
      });
      origOpen.apply(this, arguments);
    };
  })();
};

export default buddiTracker;
