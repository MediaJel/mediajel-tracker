import { QueryStringContext } from "../../../shared/types";
import woocommerceDataSource from "src/shared/environment-data-sources/woocommerce";

const woocommerceTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  woocommerceDataSource({
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
        transactionData.currency,
        transactionData.userId
      );

      transactionData.items.forEach((item) => {
        window.tracker(
          "addItem",
          transactionData.id,
          item.sku,
          item.name,
          item.category,
          item.quantity,
          item.unitPrice,
          item.currency
        );
      });
    },
  });
};

export default woocommerceTracker;
