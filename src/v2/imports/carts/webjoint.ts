import { createSegments } from "src/shared/segment-builder";
import webjointDataSource from "../../../shared/environment-data-sources/webjoint";
import { QueryStringContext } from "../../../shared/types";

const webjointTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  var isTrackerSubmitted = false;

  webjointDataSource({
    transactionEvent(transactionData) {
      window.tracker("addTrans", {
        orderId: transactionData.id,
        affiliation: retailId ?? appId,
        total: transactionData.total,
        tax: transactionData.tax,
        shippping: transactionData.shipping,
        city: transactionData.city,
        state: transactionData.state,
        country: transactionData.country,
        currency: transactionData.currency,
      });

      transactionData.items.forEach((items) => {
        const { orderId, category, currency, name, quantity, sku, unitPrice } = items;
        window.tracker("addItem", {
          orderId,
          sku,
          name,
          category,
          price: unitPrice,
          quantity,
          currency,
        });
      });

      if (!isTrackerSubmitted) {
        window.tracker("trackTrans");

        segments.nexxen.emitPurchase({
          bprice: transactionData.total,
          cid: transactionData.id,
        });

        segments.dstillery.emitPurchase({
          orderId: transactionData.id,
          amount: transactionData.total,
        });
        isTrackerSubmitted = true;
      }
    },
  });
};

export default webjointTracker;
