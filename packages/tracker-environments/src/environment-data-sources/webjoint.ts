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

    // Only an order submission carries a non-empty orders array with line
    // details; other bodies with an "orders" key (lists, filters) skip silently.
    const order = Array.isArray(parsedData?.orders) ? parsedData.orders[0] : undefined;
    if (order && typeof order === "object" && Array.isArray(order.details)) {
      try {
        observable.notify({
          transactionEvent: {
            id: order.id || "N/A",
            total: parseFloat(order.total) || 0,
            tax: parseFloat(order.taxes) || 0,
            city: "N/A",
            country: "USA",
            currency: "USD",
            shipping: 0,
            state: "N/A",
            items: order.details.map((item: any) => {
              const { name, quantity } = item;
              return {
                orderId: (order["_id"] ?? order.id ?? "N/A").toString(),
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
