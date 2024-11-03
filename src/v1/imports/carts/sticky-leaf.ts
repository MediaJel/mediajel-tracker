import { createSegments } from "src/shared/segment-builder";

import stickyLeafDataSource from "../../../shared/environment-data-sources/sticky-leaf";
import { QueryStringContext } from "../../../shared/types";

const stickyLeafTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  stickyLeafDataSource({
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

export default stickyLeafTracker;
