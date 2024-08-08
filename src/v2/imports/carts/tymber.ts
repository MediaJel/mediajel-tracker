import tymberDataSource from "src/shared/environment-data-sources/tymber";
import { QueryStringContext } from "../../../shared/types";
import { createSegments } from "src/shared/segment-builder";

const tymberTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  tymberDataSource({
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
        country: "N/A",
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
          currency: transactionData.currency,
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

export default tymberTracker;
