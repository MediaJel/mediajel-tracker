import dutchieIframeDataSource from "src/shared/environment-data-sources/dutchie-iframe";
import { createSegments } from "src/shared/segment-builder";

import { QueryStringContext } from "../../../shared/types";

const dutchieIframeTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  dutchieIframeDataSource({
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
    },
  });
};

export default dutchieIframeTracker;
