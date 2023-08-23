import { xhrResponseSource } from "../../../shared/sources/xhr-response-source";
import { QueryStringContext } from "../../../shared/types";
import bigcommerceDataSource from "../../../shared/environment-data-sources/bigcommerce"

const bigcommerceTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
    bigcommerceDataSource({
        transactionEvent(transactionData) {
            window.tracker(
              "addTrans",
              transactionData.id,
              "N/A",
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

export default bigcommerceTracker;
