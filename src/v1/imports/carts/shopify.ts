import { QueryStringContext } from "../../../shared/types";
import shopifyDataSource from "src/shared/environment-data-sources/shopify";

const shopifyTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  shopifyDataSource({
    transactionEvent(transactionData) {
      window.tracker(
        "addTrans",
        transactionData.userId,
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

      transactionData?.items?.forEach((item) => {
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
    },
  });
};

export default shopifyTracker;
