import { QueryStringContext } from "../../../shared/types";
import leaflyDataSource from "src/shared/environment-data-sources/leafly";

const leaflyTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  leaflyDataSource({
    transactionEvent(transactionData) {
      window.tracker("addTrans", {
        orderId: transactionData.id,
        affiliation: retailId ?? appId,
        total: transactionData.total,
        tax: transactionData.tax,
        shipping: transactionData.shipping,
        city: transactionData.city,
        state: transactionData.state,
        country: transactionData.country,
        currency: transactionData.currency,
      });

      window.tracker("trackTrans");
    },
  });
};

export default leaflyTracker;
