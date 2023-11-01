import magentoDataSource from "src/shared/environment-data-sources/magento";
import { QueryStringContext } from "../../../shared/types";

const magentoTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  magentoDataSource({
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
        currency: "USD",
      });

      transactionData.items.forEach((item) => {
        window.tracker("addItem", {
          orderId: transactionData.id,
          sku: item.sku,
          name: item.name,
          category: item.category,
          price: item.unitPrice,
          quantity: item.quantity,
          currency: "USD",
        });
      });
      window.tracker("trackTrans");
    },
  });
};

export default magentoTracker;
