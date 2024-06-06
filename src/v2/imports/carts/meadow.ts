import { QueryStringContext } from "../../../shared/types";
import meadowTrackerImport from "src/shared/environment-data-sources/meadow";

const meadowTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  meadowTrackerImport({
    addToCartEvent(cartData) {
      window.tracker("trackAddToCart", {
        sku: cartData.sku,
        name: cartData.name,
        category: cartData.category,
        unitPrice: cartData.unitPrice,
        quantity: cartData.quantity,
        currency: cartData.currency,
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
    },
  });
};

export default meadowTracker;
