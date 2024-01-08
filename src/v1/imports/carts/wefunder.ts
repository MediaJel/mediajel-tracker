import { QueryStringContext } from "../../../shared/types";
import wefunderTrackerImport from "src/shared/environment-data-sources/wefunder";

const wefunderTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  wefunderTrackerImport({
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

export default wefunderTracker;
