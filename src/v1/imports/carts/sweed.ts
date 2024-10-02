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
    //// TODO FIX THIS: Issue sometimes it doesn't get the right data from the datalayer which returns null | HARD TO REPLICATE | DUPLICATION OF ADD AND REMOVE CART EVENTS
    // addToCartEvent(addToCartData) {
    //   console.log("Sweed addToCartEvent Event, Tracker: ", { addToCartData });
    //   window.tracker(
    //     "trackAddToCart",
    //     addToCartData.sku,
    //     addToCartData.name,
    //     addToCartData.category,
    //     addToCartData.unitPrice,
    //     addToCartData.quantity,
    //     addToCartData.currency
    //   );
    // },
    // removeFromCartEvent(removeFromCartData) {
    //   console.log("Sweed trackRemoveFromCart Event, Tracker: ", { removeFromCartData });
    //   window.tracker(
    //     "trackRemoveFromCart",
    //     removeFromCartData.sku,
    //     removeFromCartData.name,
    //     removeFromCartData.category,
    //     removeFromCartData.unitPrice,
    //     removeFromCartData.quantity,
    //     removeFromCartData.currency
    //   );
    // },
    transactionEvent(transactionData) {
      console.log("Sweed Transaction Event, Tracker: ", { transactionData });
      window.tracker(
        "addTrans",
        transactionData.id,
        retailId ?? appId,
        transactionData.total,
        transactionData.tax,
        transactionData.shipping,
        transactionData.city,
        transactionData.state,
        transactionData.country,
        transactionData.currency
      );

      transactionData.items.forEach((item) => {
        window.tracker(
          "addItem",
          transactionData.id,
          item.sku,
          item.name,
          item.category,
          item.unitPrice,
          item.quantity,
          transactionData.currency
        );
      });
      window.tracker("trackTrans");
      console.log("Sweed track success!");

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
