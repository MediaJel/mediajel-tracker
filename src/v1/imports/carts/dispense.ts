import { createSegments } from "src/shared/segment-builder";

import dispenseDataSource from "../../../shared/environment-data-sources/dispense";
import { QueryStringContext } from "../../../shared/types";

const dispenseTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  dispenseDataSource({
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
    },
  });
};

export default dispenseTracker;
