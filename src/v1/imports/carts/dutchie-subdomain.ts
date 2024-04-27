import dutchieSubdomainDataSource from "../../../shared/environment-data-sources/dutchie-subdomain";
import { QueryStringContext } from "../../../shared/types";

const dutchieSubdomainTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  dutchieSubdomainDataSource({
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
        transactionData.country
      );

      transactionData.items.forEach((item) => {
        window.tracker(
          "addItem",
          transactionData.id,
          item.sku,
          item.name,
          item.category,
          item.unitPrice,
          item.quantity,
          transactionData.currency
        );
      });
      window.tracker("trackTrans");
    },
  });
};

export default dutchieSubdomainTracker;
