import yotpoDataSource from "../../../shared/environment-data-sources/yotpo";
import { QueryStringContext } from "../../../shared/types";

const yotpoTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  yotpoDataSource({
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

      transactionData.items.forEach((item) => {
        window.tracker("addItem", {
          orderId: item.orderId,
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.unitPrice,
          quantity: item.quantity,
          currency: item.currency,
        });
      });

      window.tracker("trackTrans");
    },
  });
};

export default yotpoTracker;
