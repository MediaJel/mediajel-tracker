import observable from "src/shared/utils/create-events-observable";
import { xhrResponseSource } from "../sources/xhr-response-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const treezDataSource = () => {
  xhrResponseSource((xhr) => {
    try {
      const getData = JSON.parse(xhr.responseText);
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
    } catch (error) {}
  });
};

export default treezDataSource;
