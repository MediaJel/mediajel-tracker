import { QueryStringContext } from "../../../shared/types";
import grassDoorTrackerImport from "src/shared/environment-data-sources/grassdoor";

const grassDoorTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  grassDoorTrackerImport({
    addToCartEvent(addToCartData) {
      window.tracker("trackAddToCart", {
        sku: addToCartData.sku,
        name: addToCartData.name,
        category: addToCartData.category,
        unitPrice: addToCartData.unitPrice,
        quantity: addToCartData.quantity,
        currency: addToCartData.currency,
      });
    },

    removeFromCartEvent(cartData) {
      window.tracker("trackRemoveFromCart", {
        sku: cartData.sku,
        name: cartData.name,
        category: cartData.category,
        unitPrice: cartData.unitPrice,
        quantity: cartData.quantity,
        currency: cartData.currency,
      });
    },

    transactionEvent(transactionData) {
      window.tracker("addTrans", {
        orderId: transactionData.id,
        affiliation: retailId ?? appId,
        total: transactionData.total,
        tax: transactionData.tax,
        shipping: transactionData.shipping,
        city: transactionData.city,
        state: transactionData.state,
        country: transactionData.country,
        currency: transactionData.currency,
      });

      transactionData.items.forEach((item) => {
        window.tracker("addItem", {
          orderId: transactionData.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.unitPrice,
          quantity: item.quantity,
          currency: item.currency,
        });
      });

      window.tracker("trackTrans");
    },
  });
};

export default grassDoorTracker;
