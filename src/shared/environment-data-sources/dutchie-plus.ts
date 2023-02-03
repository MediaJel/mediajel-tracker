import { datalayerSource } from "../sources/google-datalayer-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const dutchiePlusDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  datalayerSource((data) => {
    if (data.event === "purchase") {
      const { transaction_id, value, items } = data.ecommerce;

      transactionEvent?.({
        total: parseFloat(value),
        id: transaction_id.toString(),
        tax: 0,
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
        items: items.map((item) => {
          const { item_id, item_brand, item_category, price, quantity } = item;

          return {
            orderId: transaction_id.toString(),
            sku: item_id.toString(),
            name: item_brand?.toString() || "N/A",
            category: item_category?.toString() || "N/A",
            unitPrice: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          } as TransactionCartItem;
        }),
      });
    }
  });
};

export default dutchiePlusDataSource;
