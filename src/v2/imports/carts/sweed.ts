import { createSegments } from "src/shared/segment-builder";
import { QueryStringContext } from "../../../shared/types";
import sweedDataSource from "src/shared/environment-data-sources/sweed";

/**
 * The Sweed Tracker relies on the Google Datalayer Source to track events.
 */
const sweedTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  sweedDataSource({
    addToCartEvent(addToCartData) {
      console.log("Sweed addToCartEvent Event, Tracker: ", { addToCartData });
      window.tracker("trackAddToCart", {
        sku: addToCartData.sku,
        name: addToCartData.name,
        category: addToCartData.category,
        unitPrice: addToCartData.unitPrice,
        quantity: addToCartData.quantity,
        currency: addToCartData.currency,
      });
    },

    removeFromCartEvent(removeFromCartData) {
      console.log("Sweed trackRemoveFromCart Event, Tracker: ", { removeFromCartData });
      window.tracker("trackRemoveFromCart", {
        sku: removeFromCartData.sku,
        name: removeFromCartData.name,
        category: removeFromCartData.category,
        unitPrice: removeFromCartData.unitPrice,
        quantity: removeFromCartData.quantity,
        currency: removeFromCartData.currency,
      });
    },
    transactionEvent(transactionData) {
      console.log("Sweed Transaction Event, Tracker: ", { transactionData });
      window.tracker("addTrans", {
        orderId: transactionData.id,
        affiliation: retailId ?? appId,
        total: transactionData.total,
        tax: transactionData.tax,
        shipping: transactionData.shipping,
        city: transactionData.city,
        state: transactionData.state,
        country: transactionData.country,
      });

      transactionData.items.forEach((item) => {
        window.tracker("addItem", {
          orderId: transactionData.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.unitPrice,
          quantity: item.quantity,
          currency: transactionData.currency,
        });
      });

      window.tracker("trackTrans");
      console.log("Sweed track success!")

      segments.nexxen.emitPurchase({
        bprice: transactionData.total,
        cid: transactionData.id,
      });

      segments.dstillery.emitPurchase({
        orderId: transactionData.id,
        amount: transactionData.total,
      });
    },
  });
};

export default sweedTracker;
