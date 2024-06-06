import stickyLeafDataSource from "../../../shared/environment-data-sources/sticky-leaf";
import { QueryStringContext } from "../../../shared/types";

const stickyLeafTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  stickyLeafDataSource({
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
      });
      window.tracker("trackTrans");
    },
  });
};

export default stickyLeafTracker;
