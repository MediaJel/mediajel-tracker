import leaflyDataSource from "src/shared/environment-data-sources/leafly";
import { createSegments } from "src/shared/segment-builder";

import { QueryStringContext } from "../../../shared/types";

const leaflyTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  leaflyDataSource({
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

      window.tracker("trackTrans");
    },
  });
};

export default leaflyTracker;
