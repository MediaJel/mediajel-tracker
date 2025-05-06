import observable from "src/shared/utils/create-events-observable";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import { xhrResponseSource } from "../sources/xhr-response-source";
import { datalayerSource } from "../sources/google-datalayer-source";
import { TransactionCartItem } from "../types";
import { multiAdapterHandler } from "../utils/adapter-handler";
import { SnowplowTracker } from "../snowplow/types";

const bigcommerceDataSource = (snowplow: SnowplowTracker) => {
  const handler = multiAdapterHandler(snowplow);

  handler.add("XHR Response Source #1", () => {
    xhrResponseSource((xhr) => {
      if (!xhr?.responseText) {
        return;
      }

      let transaction;
      try {
        const parsedData = JSON.parse(xhr.responseText);
        // Verify parsed data is actually an object
        if (!parsedData || typeof parsedData !== "object") {
          return;
        }
        transaction = parsedData;
      } catch (e) {
        // Silent fail if JSON parsing fails
        return;
      }

      const products = transaction?.lineItems?.physicalItems;
      const getLatestOrder = localStorage.getItem("latestOrder");

      if (!transaction?.orderId) return;
      if (transaction?.status !== "AWAITING_FULFILLMENT") return;
      if (getLatestOrder === transaction.orderId.toString()) return;

      try {
        observable.notify({
          transactionEvent: {
            id: transaction.orderId.toString(),
            total: parseFloat(transaction.orderAmount),
            tax: parseFloat(transaction.taxTotal) || 0,
            shipping: parseFloat(transaction.shippingCostTotal) || 0,
            city: (transaction?.billingAddress?.city || "N/A").toString(),
            state: (transaction?.billingAddress?.stateOrProvinceCode || "N/A").toString(),
            country: (transaction?.billingAddress?.countryCode || "N/A").toString(),
            currency: "USD",
            items:
              products?.map((product) => {
                const { sku, name, listPrice, quantity } = product;
                return {
                  orderId: transaction.orderId.toString(),
                  sku: sku?.toString() || "N/A",
                  name: (name || "N/A").toString(),
                  category: "N/A",
                  unitPrice: parseFloat(listPrice || 0),
                  quantity: parseInt(quantity || 1),
                  currency: "USD",
                } as TransactionCartItem;
              }) || [],
          },
        });
        localStorage.setItem("latestOrder", transaction.orderId.toString());
      } catch (e) {
        // Silent fail for notification errors
      }
    });
  });

  handler.add("XHR Response Source #2", () => {
    xhrResponseSource((xhr) => {
      let transaction;
      try {
        transaction = JSON.parse(xhr.responseText);
      } catch (e) {
        // Silent fail if JSON parsing fails
        return;
      }

      if (transaction?.status && transaction?.orderAmount > 0) {
        try {
          isTrackerLoaded(() => {
            observable.notify({
              transactionEvent: {
                id: transaction?.orderId?.toString() || "",
                total: parseFloat(transaction?.orderAmount || 0),
                tax: parseFloat(transaction?.taxTotal || 0),
                shipping: parseFloat(transaction?.shippingCostTotal || 0),
                city: (transaction?.billingAddress?.city || "N/A").toString(),
                state: (transaction?.billingAddress?.stateOrProvinceCode || "N/A").toString(),
                country: (transaction?.billingAddress?.countryCode || "N/A").toString(),
                currency: "USD",
                items:
                  transaction?.lineItems?.physicalItems?.map((item) => ({
                    orderId: transaction?.orderId?.toString() || "",
                    sku: item?.sku?.toString() || "N/A",
                    name: (item?.name || "N/A").toString(),
                    category: "N/A",
                    unitPrice: parseFloat(item?.listPrice || 0),
                    quantity: parseInt(item?.quantity || 1),
                    currency: "USD",
                  })) || [],
              },
            });
          });
        } catch (error) {
          // Silent fail for tracker errors
        }
      }
    });
  });

  handler.add("Datalayer Source", () => {
    datalayerSource((data) => {
      const purchase = data[2];
      const items = purchase?.items || [];

      if (data[1] === "purchase") {
        observable.notify({
          transactionEvent: {
            id: purchase.transaction_id.toString(),
            total: parseFloat(purchase.value || 0),
            tax: parseFloat(purchase.tax || 0),
            shipping: parseFloat(purchase.shipping || 0),
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: "USD",
            items: items.map((item) => ({
                orderId: purchase.transaction_id.toString(),
                sku: item.item_id.toString() || "N/A",
                name: (item.item_name || "N/A").toString(),
                category: item.item_category.toString() || "N/A",
                unitPrice: parseFloat(item.price || 0),
                quantity: parseInt(item.quantity || 1),
                currency: "USD",
              })),
          },
        });
      }
    });
  });

  handler.execute();
};

export default bigcommerceDataSource;
