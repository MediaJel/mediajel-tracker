import { createSegments } from "src/shared/segment-builder";
import squareDataSource from "../../../shared/environment-data-sources/square";
import { QueryStringContext } from "../../../shared/types";

/**
 * The Square Tracker relies on the Google Datalayer Source to track events.
 * There is documentation to improve this more since Square exports variables
 * to the window object.
 */
const squareTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  squareDataSource({
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

export default squareTracker;
