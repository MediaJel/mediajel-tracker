import { datalayerSource } from "../sources/google-datalayer-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const dispenseDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  datalayerSource((data) => {
    if (data[1] === "purchase") {
      try {
        const { transaction_id, tax, value, items } = data[2];
        transactionEvent?.({
          total: parseFloat(value),
          id: transaction_id.toString(),
          tax,
          shipping: 0,
          city: "N/A",
          state: "N/A",
          country: "USA",
          currency: "USD",
          items: items.map((item) => {
            const { item_name, item_category, price, quantity } = item;

            return {
              orderId: transaction_id.toString(),
              sku: item_name.toString() || "N/A",
              name: item_name?.toString() || "N/A",
              category: item_category?.toString() || "N/A",
              unitPrice: parseFloat(price || 0),
              quantity: parseInt(quantity || 1),
              currency: "USD",
            } as TransactionCartItem;
          }),
        });
      } catch (error) {
        // window.tracker('trackError', JSON.stringify(error), 'DISPENSE')
      }
    }
  }, window.gtmDataLayer); // special case for dispense; window.dataLayer is renamed to window.gtmDataLayer
};

export default dispenseDataSource;
