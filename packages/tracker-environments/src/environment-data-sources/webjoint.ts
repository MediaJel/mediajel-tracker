import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import observable from "@mediajel/tracker-core/utils/create-events-observable";

import { xhrRequestSource } from "@mediajel/tracker-core/sources/xhr-request-source";
import { TransactionCartItem } from "@mediajel/tracker-core/types";

const webjointDataSource = () => {
  xhrRequestSource((data: any): void => {
    let parsedData;
    try {
      parsedData = JSON.parse(data);
    } catch (e) {
      // Silent fail if JSON parsing fails — this source sees every XHR request body
      // the page sends, and a SyntaxError would carry that body (guard() would
      // otherwise report it through the error funnel).
      return;
    }

    if (parsedData && Object.keys(parsedData).includes("orders")) {
      try {
        observable.notify({
          transactionEvent: {
            id: parsedData.orders[0].id || "N/A",
            total: parseFloat(parsedData.orders[0].total) || 0,
            tax: parseFloat(parsedData.orders[0].taxes) || 0,
            city: "N/A",
            country: "USA",
            currency: "USD",
            shipping: 0,
            state: "N/A",
            items: parsedData.orders[0].details.map((item: any) => {
              const { name, quantity } = item;
              return {
                orderId: parsedData.orders[0]["_id"].toString() || parsedData.orders[0].id.toString() || "N/A",
                category: "N/A".toString(),
                currency: "USD",
                name: (name || "N/A").toString(),
                quantity: parseFloat(quantity) || 1,
                sku: "N/A",
                unitPrice: 0,
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {
        notifyError(error, "webjoint");
      }
    }
  });
};

export default webjointDataSource;
