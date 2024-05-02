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
          item.currency,
        );
      });

      window.tracker("trackTrans");
    },
  });
};

export default woocommerceTracker;
