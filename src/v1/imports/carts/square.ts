import squareDataSource from "../../../shared/environment-data-sources/square";
import { QueryStringContext } from "../../../shared/types";

/**
 * The Square Tracker relies on the Google Datalayer Source to track events.
 * There is documentation to improve this more since Square exports variables
 * to the window object.
 */
const squareTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  squareDataSource({
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
        transactionData.currency
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

export default squareTracker;
