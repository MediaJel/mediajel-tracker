import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import { xhrResponseSource } from "@mediajel/tracker-core/sources/xhr-response-source";
import { TransactionCartItem } from "@mediajel/tracker-core/types";

const treezDataSource = () => {
  xhrResponseSource((xhr) => {
    let getData;
    try {
      const parsedData = JSON.parse(xhr.responseText);
      // Verify parsed data is actually an object
      if (!parsedData || typeof parsedData !== "object") {
        return;
      }
      getData = parsedData;
    } catch (e) {
      // Silent fail if JSON parsing fails — a SyntaxError would carry the host response body
      return;
    }

    try {
      if (getData.orderNumber && getData.total) {
        const items = getData?.items;

        observable.notify({
          transactionEvent: {
            id: getData.orderNumber.toString(),
            total: parseFloat(getData.total || 0),
            tax: parseFloat(getData.tax || 0),
            shipping: parseFloat(getData.deliveryCost || 0),
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: "USD",
            items: items.map((item: any) => {
              return {
                orderId: getData.orderNumber.toString(),
                name: item.name,
                sku: item.productId || "N/A",
                category: item.category || "N/A",
                unitPrice: parseFloat(item.originalPrice || 0),
                quantity: parseInt(item.quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      }
    } catch (error) {
      notifyError(error, "treez");
    }
  });
};

export default treezDataSource;
