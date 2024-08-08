import dutchieIframeDataSource from "src/shared/environment-data-sources/dutchie-iframe";
import { QueryStringContext } from "../../../shared/types";
import { createSegments } from "src/shared/segment-builder";

const dutchieIframeTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
): void => {
  dutchieIframeDataSource({
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

      segments.nexxen.emitPurchase({
        bprice: transactionData.total,
        cid: transactionData.id,
      });
    },
  });
};

export default dutchieIframeTracker;
