import logger from "src/shared/logger";
import observable from "src/shared/utils/create-events-observable";

import { fetchSource } from "../sources/fetch-source";
import { datalayerSource } from "../sources/google-datalayer-source";
import { runOncePerPageLoad } from "../sources/utils/trans-deduplicator";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const TransactionCache = (ttl: number) => {
  let success = false;

  return {
    recordTransaction: () => {
      success = true;

      setTimeout(() => {
        success = false;
      }, ttl);
    },
    isTransactionRecorded: () => success,
  };
};

const cache = TransactionCache(5000);

const dispenseDataSource = () => {
  const dataLayerCheck = () => {
    datalayerSource((data) => {
      if (cache.isTransactionRecorded()) {
        logger.info("Transaction has happened");
        return;
      }

      if (data[1] === "purchase") {
        try {
          const { transaction_id, tax, value, items } = data[2];

          observable.notify({
            transactionEvent: {
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
            },
          });

          cache.recordTransaction(); // Allows the IF case to execute break on the switch case
        } catch (error) {
          // window.tracker('trackError', JSON.stringify(error), 'DISPENSE')
        }
      }
    }, window.gtmDataLayer); // special case for dispense; window.dataLayer is renamed to window.gtmDataLayer
  };

  const fetchSourceCheck = () => {
    fetchSource(
      (request) => {},
      (reponse, responseBody) => {
        if (cache.isTransactionRecorded()) {
          logger.info("Transaction has happened");
          return;
        }

        window.addEventListener("beforeunload", () => {
          sessionStorage.removeItem("key");
        });

        if (window.location.href.includes("/checkout-complete")) {
          try {
            runOncePerPageLoad(() => {
              observable.notify({
                transactionEvent: {
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
                },
              });
            });

            cache.recordTransaction(); // Allows the IF case to execute break on the switch case
            // success = true; // Allows the IF case to execute break on the switch case
          } catch (error) {}
        }
      }
    );
  };

  dataLayerCheck();
  fetchSourceCheck();
  // ALLOWS FOR MULTIPLE USE CASES FOR SCALABILITY

  // switch (counter) {
  //   case 1:
  //     dataLayerCheck();
  //     if (success) {
  //       break;
  //     }
  //   case 2:
  //     fetchSourceCheck();
  //     if (success) {
  //       break;
  //     }
  //   default:
  //     logger.info("DISPENSE ENVIRONMENT ERROR AT CASE ", counter);
  // }
};

export default dispenseDataSource;
