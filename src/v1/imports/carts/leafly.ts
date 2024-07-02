import { QueryStringContext } from "../../../shared/types";
import leaflyDataSource from "src/shared/environment-data-sources/leafly";

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
