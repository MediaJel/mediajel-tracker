import logger from "src/shared/logger";
import { createSegments } from "src/shared/segment-builder";

import dutchieSubdomainDataSource from "../../../shared/environment-data-sources/dutchie-subdomain";
import { QueryStringContext } from "../../../shared/types";

//
const dutchieSubdomainTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  dutchieSubdomainDataSource({
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
      logger.info("Dutchie Transaction Event, Tracker: ", { transactionData });

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
export default dutchieSubdomainTracker;
