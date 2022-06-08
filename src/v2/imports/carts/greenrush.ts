import { xhrSource } from "../../../shared/sources/xhr-source";
import { QueryStringContext } from "../../../shared/types";

const greenrushTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
  xhrSource((xhr: XMLHttpRequest) => {
    const response = xhr.responseText;
    if (xhr.responseURL.includes("cart") && xhr.response.includes("pending")) {
      const transaction = JSON.parse(response);
      const product = transaction.data.items.data;
      window.tracker("addTrans", {
        orderId: transaction.data.id.toString(),
        affiliation: !retailId ? appId : retailId,
        total: parseFloat(transaction.data.total),
        tax: parseFloat(transaction.data.tax),
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "USA",
        currency: "USD",
      });
      for (let i = 0, l = product.length; i < l; i++) {
        const item = product[i];
        window.tracker("addItem", {
          orderId: transaction.data.id.toString(),
          sku: item.id.toString(),
          name: item.name.toString(),
          category: item.category.toString(),
          price: parseFloat(item.price),
          quantity: parseInt(item.quantity),
          currency: "USD",
        });
      }
      window.tracker("trackTrans");
    }
  });
};

export default greenrushTracker;
