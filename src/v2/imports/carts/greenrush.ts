import { xhrSource } from "../../../shared/sources/xhr-source";
import { QueryStringContext } from "../../../shared/types";

const greenrushTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  xhrSource((xhr: XMLHttpRequest) => {
    const response = xhr.responseText;
    if (xhr.responseURL.includes("cart") && xhr.response.includes("pending")) {
      const transaction = JSON.parse(response);
      const product = transaction.items.data;
      window.tracker("addTrans", {
        orderId: transaction.id,
        affiliation: !retailId ? appId : retailId,
        total: parseInt(transaction.total),
        tax: parseInt(transaction.tax),
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "USA",
        currency: "US",
      });
      for (let i = 0, l = product.length; i < l; i++) {
        const item = product[i];
        window.tracker("addItem", {
          orderId: transaction.id,
          sku: item.id,
          name: item.name,
          category: item.subcategory,
          price: item.price,
          quantity: item.quantity,
          currency: "US",
        });
      }
      window.tracker("trackTrans");
    }
  });
};

export default greenrushTracker;
