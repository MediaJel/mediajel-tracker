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
              window.tracker(
                "addTrans",
                responseBody.id,
                "N/A",
                parseFloat(responseBody.total || "0"),
                parseFloat(responseBody.totalTax || "0"),
                0,
                "N/A",
                "N/A",
                "N/A",
                "USD"
              );

              responseBody.items.forEach((item) => {
                window.tracker(
                  "addItem",
                  responseBody.id,
                  item.product.sku || "N/A",
                  item.product.name || "N/A",
                  item.product.productCategoryName || "N/A",
                  parseFloat(item.price || "0"),
                  parseInt(item.quantity || "0"),
                  "USD"
                );
              });

              window.tracker("trackTrans");
            }
            localStorage.setItem(key, "loaded");
          }
        } catch (error) {}
      }
    );
  }
};

export default dispenseDataSource;
