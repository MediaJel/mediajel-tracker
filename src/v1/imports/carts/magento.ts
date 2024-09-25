import { QueryStringContext } from "../../../shared/types";
import magentoDataSource from "../../../shared/environment-data-sources/magento";
import { createSegments } from "src/shared/segment-builder";

const magentoTracker = (
  { appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">,
  segments: ReturnType<typeof createSegments>
) => {
  magentoDataSource({
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

export default magentoTracker;
