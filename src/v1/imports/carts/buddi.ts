import { QueryStringContext } from "../../../shared/types";
import buddiTrackerImport from "../../../shared/environment-data-sources/buddi";
import { createSegments } from "src/shared/segment-builder";

const buddiTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  buddiTrackerImport({
    addToCartEvent(addToCartData) {
      window.tracker(
        "trackAddToCart",
        addToCartData.sku,
        addToCartData.name,
        addToCartData.category,
        addToCartData.unitPrice,
        addToCartData.quantity,
        addToCartData.currency
      );
    },

    removeFromCartEvent(removeFromCartData) {
      window.tracker(
        "trackRemoveFromCart",
        removeFromCartData.sku,
        removeFromCartData.name,
        removeFromCartData.category,
        removeFromCartData.unitPrice,
        removeFromCartData.quantity,
        removeFromCartData.currency
      );
    },

    transactionEvent(transactionData) {
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
          item.orderId,
          item.sku,
          item.name,
          item.category,
          item.unitPrice,
          item.quantity,
          item.currency
        );
      });
      window.tracker("trackTrans");

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

export default buddiTracker;
