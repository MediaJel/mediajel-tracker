import bigcommerceDataSource from "src/shared/environment-data-sources/bigcommerce";
import { QueryStringContext } from "../../../shared/types";

const bigcommerceTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  bigcommerceDataSource({
    transactionEvent(transactionData) {
      window.tracker("addTrans", {
        id: transactionData.id,
        affiliation: retailId ?? appId,
        total: transactionData.total,
        tax: transactionData.tax,
        shipping: transactionData.shipping,
        city: transactionData.city,
        state: transactionData.state,
        country: transactionData.country,
        currency: transactionData.currency,
      });

      transactionData.items.forEach((item, index) => {
        window.tracker("addItem", {
          orderId: transactionData.id,
          productId: item.sku,
          sku: item.sku,
          name: item.name,
          category: item.category,
          unitPrice: item.unitPrice,
          quantity: item.quantity,
          currency: transactionData.currency,
        });
      });

      window.tracker("trackTrans");
    },
  });
};

export default bigcommerceTracker;
