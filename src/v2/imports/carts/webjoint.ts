import webjointDataSource from "../../../shared/environment-data-sources/webjoint";
import { QueryStringContext } from "../../../shared/types";

const webjointTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  webjointDataSource({
    transactionEvent(transactionData) {
      window.tracker("addTrans", {
        orderId: transactionData.id,
        affiliation: retailId ?? appId,
        total: transactionData.total,
        tax: 0,
        shippping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
      });

      transactionData.items.forEach((items) => {
        const { orderId, category, currency, name, quantity, sku, unitPrice } = items;
        window.tracker("addItem", {
          orderId,
          sku,
          name,
          category,
          unitPrice,
          quantity,
          currency,
        });
      });

      window.tracker("trackTrans");
    },
  });
};

export default webjointTracker;
