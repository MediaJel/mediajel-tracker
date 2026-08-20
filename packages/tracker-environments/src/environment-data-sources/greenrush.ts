import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import observable from "@mediajel/tracker-core/utils/create-events-observable";

import { xhrResponseSource } from "@mediajel/tracker-core/sources/xhr-response-source";
import { TransactionCartItem } from "@mediajel/tracker-core/types";

const greenrushDataSource = () => {
  xhrResponseSource((xhr: XMLHttpRequest) => {
    if (xhr.responseURL.includes("cart")) {
      let transaction;
      try {
        // xhr.responseText is a throwing getter (InvalidStateError when the host
        // set a non-text responseType), so it must stay inside the try — and the
        // "pending" filter reads the same text, not xhr.response, which is a
        // non-string for those responseTypes.
        const response = xhr.responseText;
        if (!response.includes("pending")) {
          return;
        }
        const parsedData = JSON.parse(response);
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
        // Unrelated host JSON reaches here — skip it silently
        // instead of filing its TypeError as a [greenrush] report.
        if (!Array.isArray(transaction.data?.items?.data) || transaction.data.id == null) {
          return;
        }
        const product = transaction.data.items.data;

        observable.notify({
          transactionEvent: {
            id: transaction.data.id.toString(),
            city: "N/A",
            country: "USA",
            currency: "USD",
            shipping: 0,
            state: "N/A",
            tax: parseFloat(transaction.data.tax),
            total: parseFloat(transaction.data.total),
            items: product.map((item: any) => {
              return {
                orderId: transaction.data.id.toString(),
                category: item.category.toString(),
                currency: "USD",
                name: item.name.toString(),
                quantity: parseInt(item.quantity),
                sku: item.id.toString(),
                unitPrice: parseFloat(item.price),
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {
        notifyError(error, "greenrush");
      }
    }
  });
};

export default greenrushDataSource;
