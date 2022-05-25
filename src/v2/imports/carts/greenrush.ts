import { xhrSource } from "../../../shared/sources/xhr-source";
import { QueryStringContext } from "../../../shared/types";

const greenrushTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  xhrSource((xhr: XMLHttpRequest) => {
    const response = xhr.responseText;
    if (xhr.responseURL.includes("cart") && xhr.response.includes("pending")) {
      const transaction = JSON.parse(response);
      const product = transaction.items.data;
      window.tracker(
        "addTrans",
        transaction.id,
        !retailId ? appId : retailId,
        parseInt(transaction.total),
        parseInt(transaction.tax),
        0,
        "N/A",
        "N/A",
        "USA",
        "US"
      );
      for (let i = 0, l = product.length; i < l; i++) {
        const item = product[i];
        window.tracker(
          "addItem",
          transaction.id,
          item.id,
          item.name,
          item.subcategory,
          item.price,
          item.quantity,
          "US"
        );
      }
      window.tracker("trackTrans");
    }
  });
};

export default greenrushTracker;
