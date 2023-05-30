import webjointDataSource from "../../../shared/environment-data-sources/webjoint";
import { QueryStringContext } from "../../../shared/types";

const webjointTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  webjointDataSource({
    transactionEvent(transactionData) {
      window.tracker("addTrans", {
        orderId: transactionData.id,
        affiliation: retailId ?? appId,
        total: transactionData.total,
        tax: transactionData.tax,
        shippping: transactionData.shipping,
        city: transactionData.city,
        state: transactionData.state,
        country: transactionData.country,
        currency: transactionData.currency,
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
