import webjointDataSource from "../../../shared/environment-data-sources/webjoint";
import { QueryStringContext } from "../../../shared/types";

const webjointTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
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
        transactionData.country
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
    },
  });
};

export default webjointTracker;
