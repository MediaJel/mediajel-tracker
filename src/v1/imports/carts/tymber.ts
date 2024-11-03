import { createSegments } from "src/shared/segment-builder";

import TymberDataSource from "../../../shared/environment-data-sources/tymber";
import { QueryStringContext } from "../../../shared/types";

const tymberTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
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
    },
  });
};

export default tymberTracker;
