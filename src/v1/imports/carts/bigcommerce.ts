import { QueryStringContext } from "../../../shared/types";
import bigcommerceDataSource from "../../../shared/environment-data-sources/bigcommerce";
import { createSegments } from "src/shared/segment-builder";

const bigcommerceTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  bigcommerceDataSource({
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
          transactionData.currency
        );
      });
      window.tracker("trackTrans");

      segments.nexxen.emitPurchase({
        cid: transactionData.id,
        bprice: transactionData.total,
      });

      segments.dstillery.emitPurchase({
        orderId: transactionData.id,
        amount: transactionData.total,
      });
    },
  });
};

export default bigcommerceTracker;
