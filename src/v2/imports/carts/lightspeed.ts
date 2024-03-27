import { QueryStringContext } from "../../../shared/types";
import lightspeedTrackerImport from "src/shared/environment-data-sources/lightspeed";

const lightspeedTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  lightspeedTrackerImport({
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
          orderId: transactionData.id,
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

export default lightspeedTracker;
