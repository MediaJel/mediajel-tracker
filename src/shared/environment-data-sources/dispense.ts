import { datalayerSource } from "../sources/google-datalayer-source";
import { fetchSource } from "../sources/fetch-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const dispenseDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  // fetchSource is optional second param to handle dispense cart;
  let success = false;

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

        success = true; // prevents fetchSource from triggering if datalayer is successful
      } catch (error) {
        // window.tracker('trackError', JSON.stringify(error), 'DISPENSE')
      }
    }
  }, window.gtmDataLayer); // special case for dispense; window.dataLayer is renamed to window.gtmDataLayer

  //  Triggers if datalayer is not available

  if (!success) {
    fetchSource(
      (request) => {},
      (reponse, responseBody) => {
        try {
          const key = "key";

          if (!localStorage.getItem(key)) {
            if (window.location.href.includes("/checkout-complete")) {
              transactionEvent?.({
                total: parseFloat(responseBody.total || "0"),
                id: responseBody.id,
                tax: parseFloat(responseBody.totalTax || "0"),
                shipping: 0,
                city: "N/A",
                state: "N/A",
                country: "USA",
                currency: "USD",
                items: responseBody.items.map((item) => {
                  return {
                    orderId: responseBody.id,
                    sku: item.product.sku || "N/A",
                    name: item.product.name || "N/A",
                    category: item.product.productCategoryName || "N/A",
                    unitPrice: parseFloat(item.price || 0),
                    quantity: parseInt(item.quantity || 1),
                    currency: "USD",
                  } as TransactionCartItem;
                }),
              });
            }
            localStorage.setItem(key, "loaded"); // do not remove, this prevents duplicating transactions
          }
        } catch (error) {}
      }
    );
  }
};

export default dispenseDataSource;
