import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import observable from "@mediajel/tracker-core/utils/create-events-observable";

import { xhrResponseSource } from "@mediajel/tracker-core/sources/xhr-response-source";
import { EnvironmentEvents, TransactionCartItem } from "@mediajel/tracker-core/types";

const wefunderTracker = () => {
  xhrResponseSource((xhr) => {
    if (xhr.responseURL.includes("investments") && typeof xhr.responseText === "string") {
      let transaction;
      try {
        const parsedData = JSON.parse(xhr.responseText);
        // Verify parsed data is actually an object
        if (!parsedData || typeof parsedData !== "object") {
          return;
        }
        transaction = parsedData;
      } catch (e) {
        // Silent fail if JSON parsing fails — a SyntaxError would carry the host response body
        return;
      }

      try {
        const products = transaction.products;

        observable.notify({
          transactionEvent: {
            id: transaction.id.toString(),
            total: parseFloat(transaction.total),
            tax: parseFloat(transaction.tax) || 0,
            shipping: parseFloat(transaction.delivery_fee) || 0,
            city: "N/A",
            state: "N/A",
            country: "USA",
            currency: "USD",
            items: products.map((product) => {
              const { item_id, item_name, item_category, price, quantity } = product;
              return {
                orderId: transaction.id.toString(),
                productId: item_id.toString(),
                sku: item_id.toString(),
                name: (item_name || "N/A").toString(),
                category: (item_category || "N/A").toString(),
                unitPrice: parseFloat(price || 0),
                quantity: parseInt(quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {
        notifyError(error, "wefunder");
      }
    }
  });
};

export default wefunderTracker;
