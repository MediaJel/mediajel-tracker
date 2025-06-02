import observable from "src/shared/utils/create-events-observable";

import { datalayerSource } from "../sources/google-datalayer-source";
import { TransactionCartItem } from "../types";

const squareDataSource = () => {
  datalayerSource((data: any): void => {
    if (data[1] === "purchase") {
      try {
        const ecommerce = data[2];
        observable.notify({
          enhancedTransactionEvent: {
            ids: [ecommerce.transaction_id],
            id: ecommerce.transaction_id,
            total: parseFloat(ecommerce.value),
            tax: parseFloat(ecommerce.tax),
            city: "N/A",
            country: "USA",
            currency: "USD",
            shipping: 0,
            state: "N/A",
            items: ecommerce.items.map((item: any) => {
              const { name, price, quantity } = item;

              return {
                orderId: ecommerce.transaction_id,
                category: "N/A",
                currency: "USD",
                name,
                quantity,
                sku: item.name, // Id is not passed in the data layer
                unitPrice: parseFloat(price),
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {
        // window.tracker("trackError", JSON.stringify(error), "SQUARE");
      }
    }
  });
};

export default squareDataSource;
