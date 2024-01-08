import { QueryStringContext } from "../../../shared/types";
import lightspeedTrackerImport from "src/shared/environment-data-sources/lightspeed";

const lightspeedTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  lightspeedTrackerImport({
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
          item.productId,
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

export default lightspeedTracker;
