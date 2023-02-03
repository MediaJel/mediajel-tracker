import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const dutchiePlusTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  datalayerSource((data: any): void => {
    if (data.event === "purchase") {
      const { transaction_id, affiliation, value, items } = data.ecommerce;

      window.tracker(
        "addTrans",
        transaction_id.toString(),
        affiliation,
        parseFloat(value),
        0,
        0,
        "N/A",
        "N/A",
        "USA",
        "USD"
      );

      items.forEach((item) => {
        const { item_id, item_brand, item_category, price, quantity } = item;

        window.tracker(
          "addItem",
          transaction_id.toString(),
          item_id.toString(),
          item_brand,
          item_category,
          parseFloat(price || 0),
          parseInt(quantity || 1),
          "USD"
        );
      });

      window.tracker("trackTrans");
    }
  });
};

export default dutchiePlusTracker;
