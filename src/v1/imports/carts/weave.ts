import { createSegments } from "src/shared/segment-builder";
import { QueryStringContext } from "src/shared/types";
import weaveDataSource from "src/shared/environment-data-sources/weave";

const weaveTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  weaveDataSource({
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
          item.orderId,
          item.sku,
          item.name,
          item.category,
          item.unitPrice,
          item.quantity,
          item.currency
        );
      });

      window.tracker("trackTrans");

      segments.nexxen.emitPurchase({
        bprice: transactionData.total,
        cid: transactionData.id,
      });
    },
  });
};

export default weaveTracker;
