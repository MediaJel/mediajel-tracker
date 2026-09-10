import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import { isTrackerLoaded } from "@mediajel/tracker-core/sources/utils/is-tracker-loaded";
import { xhrResponseSource } from "@mediajel/tracker-core/sources/xhr-response-source";
import { datalayerSource } from "@mediajel/tracker-core/sources/google-datalayer-source";
import { TransactionCartItem } from "@mediajel/tracker-core/types";
import { multiAdapterHandler } from "@mediajel/tracker-core/utils/adapter-handler";
import { SnowplowTracker } from "@mediajel/tracker-core/snowplow/types";
import { xhrJsonObject } from "@mediajel/tracker-core/utils/xhr-json";

const bigcommerceDataSource = (snowplow: SnowplowTracker) => {
  const handler = multiAdapterHandler(snowplow);

  handler.add("XHR Response Source #1", () => {
    xhrResponseSource((xhr) => {
      // Silent reader: the responseText getter throws for non-text responseTypes
      // and this source sees every XHR on the page, so nothing here may report.
      const transaction = xhrJsonObject(xhr);
      if (!transaction) return;

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
        notifyError(e, "bigcommerce");
      }
    });
  });

  handler.add("XHR Response Source #2", () => {
    xhrResponseSource((xhr) => {
      const transaction = xhrJsonObject(xhr);
      if (!transaction) return;

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
          notifyError(error, "bigcommerce");
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
