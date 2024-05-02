import webjointDataSource from "../../../shared/environment-data-sources/webjoint";
import { QueryStringContext } from "../../../shared/types";

const webjointTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  var isTrackerSubmitted = false;

  webjointDataSource({
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
          transactionData.currency
        );
      });

      if (!isTrackerSubmitted) {
        window.tracker("trackTrans");
        isTrackerSubmitted = true;
      }
    },
  });
};

export default webjointTracker;
