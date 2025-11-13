import logger from "src/shared/logger";
import observable from "src/shared/utils/create-events-observable";

import { fetchSource } from "../sources/fetch-source";
import { datalayerSource } from "../sources/google-datalayer-source";
import { runOncePerPageLoad } from "../sources/utils/trans-deduplicator";
import { TransactionCartItem } from "../types";
import { multiAdapterHandler } from "../utils/adapter-handler";
import { SnowplowTracker } from "../snowplow/types";

// TODO: Remove Transaction Cache in favor of Higher Order Function extension

const dispenseDataSource = (snowplow: SnowplowTracker) => {
  const handler = multiAdapterHandler(snowplow);

  handler.add("DatalayerSource", () => {
    datalayerSource((data) => {
      if (data[1] === "purchase") {
        try {
          const { transaction_id, tax, value, items, coupon } = data[2];

          const discounts = items.map((item) => parseFloat(item.discount || 0));
          const totalDiscount = discounts.reduce((sum, discount) => sum + discount, 0);

          observable.notify({
            transactionEvent: {
              total: parseFloat(value),
              id: transaction_id.toString(),
              tax,
              shipping: 0,
              couponCode: coupon || 0,
              discount: totalDiscount || 0,
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
        } catch (error) {
          // window.tracker('trackError', JSON.stringify(error), 'DISPENSE')
        }
      }
    }, window.gtmDataLayer); // special case for dispense; window.dataLayer is renamed to window.gtmDataLayer
  });

  handler.add("FetchSource", () => {
    fetchSource(
      (request) => {},
      (reponse, responseBody) => {
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

            // success = true; // Allows the IF case to execute break on the switch case
          } catch (error) {}
        }
      },
    );
  });

  handler.execute();
};

export default dispenseDataSource;
