import { QueryStringContext } from "../../../shared/types";
import TymberDataSource from "../../../shared/environment-data-sources/tymber";
import { createSegments } from "src/shared/segment-builder";

const tymberTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  TymberDataSource({
    addToCartEvent(cartData) {
      window.tracker(
        "trackAddToCart",
        cartData.sku,
        cartData.name,
        cartData.category,
        cartData.unitPrice,
        cartData.quantity,
        cartData.currency
      );
    },

    removeFromCartEvent(cartData) {
      window.tracker(
        "trackRemoveFromCart",
        cartData.sku,
        cartData.name,
        cartData.category,
        cartData.unitPrice,
        cartData.quantity,
        cartData.currency
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

export default tymberTracker;
