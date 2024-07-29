import { datalayerSource } from "../sources/google-datalayer-source";
import { fetchSource } from "../sources/fetch-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const dispenseDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  let success = false;
  let counter = 1;

  const dataLayerCheck = () => {
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

          success = true; // Allows the IF case to execute break on the switch case
        } catch (error) {
          // window.tracker('trackError', JSON.stringify(error), 'DISPENSE')
        }
      }
    }, window.gtmDataLayer); // special case for dispense; window.dataLayer is renamed to window.gtmDataLayer
  };

  // This function runs once per page load
  const fetchSourceCheck = () => {
    function runOncePerPageLoad(callback) {
      const key = "key";

      if (!sessionStorage.getItem(key)) {
        console.log("First run in this session");
        callback();
        sessionStorage.setItem(key, "loaded");
      } else {
        console.log("Already run in this session");
      }
    }

    // Listen for the unload event to reset the sessionStorage item
    window.addEventListener("beforeunload", () => {
      sessionStorage.removeItem("key");
    });

    fetchSource(
      (request) => {},
      (reponse, responseBody) => {
        try {
          runOncePerPageLoad(() => {
            if (window.location.href.includes("/checkout-complete")) {
              transactionEvent?.({
                total: parseFloat(responseBody.total || 0),
                id: responseBody.id,
                tax: parseFloat(responseBody.totalTax || 0),
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
          });

          success = true; // Allows the IF case to execute break on the switch case
        } catch (error) {}
      }
    );
  };

  // ALLOWS FOR MULTIPLE USE CASES FOR SCALABILITY

  switch (counter) {
    case 1:
      dataLayerCheck();
      if (success) {
        break;
      }
    case 2:
      fetchSourceCheck();
      if (success) {
        break;
      }
    default:
      console.log("DISPENSE ENVIRONMENT ERROR AT CASE ", counter);
  }
};

export default dispenseDataSource;
