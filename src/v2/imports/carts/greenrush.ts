import { xhrSource } from "../../../shared/sources/xhr-source";
import { QueryStringContext } from "../../../shared/types";

const greenrushTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  xhrSource((xhr: XMLHttpRequest) => {
    const response = xhr.responseText;
    if (response.includes("pending")) {
      const transaction = JSON.parse(response);
      const product = transaction.data.items.data;
      window.tracker("addTrans", {
        orderId: transaction.data.id.toString(),
        affiliation: !retailId ? appId : retailId,
        total: parseInt(transaction.data.total),
        tax: parseInt(transaction.data.tax),
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "USA",
        currency: "US",
      });
      for (let i = 0, l = product.length; i < l; i++) {
        const item = product[i];
        window.tracker("addItem", {
          orderId: transaction.data.id.toString(),
          sku: item.id.toString(),
          name: item.name,
          category: item.category,
          price: item.price,
          quantity: item.quantity,
          currency: "US",
        });
      }
      window.tracker("trackTrans");
    } else {
      return;
    }
  });
};

export default greenrushTracker;
