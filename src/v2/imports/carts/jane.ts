import janeDataSource from "src/shared/environment-data-sources/jane";
import { QueryStringContext } from "../../../shared/types";
import { createSegments } from "src/shared/segment-builder";

const janeTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
): void => {
  janeDataSource({
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

export default janeTracker;
