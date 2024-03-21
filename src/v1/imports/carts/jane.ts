import { QueryStringContext } from "../../../shared/types";
import janeDataSource from "src/shared/environment-data-sources/jane";

const janeTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  janeDataSource({
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
          item.currency
        );
      });
      window.tracker("trackTrans");
    },
  });
};

export default janeTracker;
