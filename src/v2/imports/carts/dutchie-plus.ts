import { datalayerSource } from "../../../shared/sources/google-datalayer-source";
import { QueryStringContext } from "../../../shared/types";

const dutchiePlusTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">): void => {
  datalayerSource((data: any): void => {
    if (data.event === "purchase") {
      const { transaction_id, affiliation, value, items } = data.ecommerce;

      window.tracker("addTrans", {
        orderId: transaction_id.toString(),
        affiliation: affiliation.toString(),
        total: parseFloat(value),
        tax: 0,
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
      });

      items.forEach((item) => {
        const { item_id, item_brand, item_category, price, quantity } = item;

        window.tracker("addItem", {
          orderId: transaction_id.toString(),
          sku: item_id.toString(),
          name: (item_brand || "N/A").toString(),
          category: (item_category || "N/A").toString(),
          price: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: "USD",
        });
      });

      window.tracker("trackTrans");
    }
  });
};

export default dutchiePlusTracker;
