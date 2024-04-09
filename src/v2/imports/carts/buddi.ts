import { QueryStringContext } from "../../../shared/types";
import buddiDataSource from "../../../shared/environment-data-sources/buddi";

const buddiTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  buddiDataSource({
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

    removeFromCartEvent(removeFromCartData) {
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
      window.tracker("addTrans", {
        orderId: transactionData.id,
        total: transactionData.total, 
        affiliation: retailId ?? appId,
        tax: transactionData.tax,
        shipping: transactionData.shipping,
        city: transactionData.city,
        state: transactionData.state,
        country: transactionData.country,
        currency: transactionData.currency,
      });

      transactionData.items.forEach((item) => {
        window.tracker("addItem", {
          orderId: item.orderId,
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

export default buddiTracker;
