import observable from "src/shared/utils/create-events-observable";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import { xhrResponseSource } from "../sources/xhr-response-source";
import { TransactionCartItem } from "../types";

const bigcommerceDataSource = () => {
  let success = false;

  xhrResponseSource((xhr) => {
    // Check if responseText exists and is not empty
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
          total: parseFloat(transaction.orderAmount || "0"),
          tax: parseFloat(transaction.taxTotal || "0") || 0,
          shipping: parseFloat(transaction.shippingCostTotal || "0") || 0,
          city: (transaction?.billingAddress?.city || "N/A").toString(),
          state: (transaction?.billingAddress?.stateOrProvinceCode || "N/A").toString(),
          country: (transaction?.billingAddress?.countryCode || "N/A").toString(),
          currency: "USD",
          items: Array.isArray(products)
            ? products
                .map((product) => {
                  if (!product) return null;
                  const { sku, name, listPrice, quantity } = product;
                  return {
                    orderId: transaction.orderId.toString(),
                    sku: sku?.toString() || "N/A",
                    name: (name || "N/A").toString(),
                    category: "N/A",
                    unitPrice: parseFloat(listPrice || "0") || 0,
                    quantity: parseInt(quantity || "1") || 1,
                    currency: "USD",
                  } as TransactionCartItem;
                })
                .filter(Boolean)
            : [],
        },
      });
      localStorage.setItem("latestOrder", transaction.orderId.toString());
      success = true;
    } catch (e) {
      // Silent fail for notification errors
    }
  });

  if (!success) {
    const trackTransaction = (transaction) => {
      if (!transaction || typeof transaction !== "object") return;

      try {
        observable.notify({
          transactionEvent: {
            id: transaction?.orderId?.toString() || "",
            total: parseFloat(transaction?.orderAmount || "0") || 0,
            tax: parseFloat(transaction?.taxTotal || "0") || 0,
            shipping: parseFloat(transaction?.shippingCostTotal || "0") || 0,
            city: (transaction?.billingAddress?.city || "N/A").toString(),
            state: (transaction?.billingAddress?.stateOrProvinceCode || "N/A").toString(),
            country: (transaction?.billingAddress?.countryCode || "N/A").toString(),
            currency: "USD",
            items: Array.isArray(transaction?.lineItems?.physicalItems)
              ? transaction.lineItems.physicalItems
                  .map((item) => {
                    if (!item) return null;
                    return {
                      orderId: transaction?.orderId?.toString() || "",
                      sku: item?.sku?.toString() || "N/A",
                      name: (item?.name || "N/A").toString(),
                      category: "N/A",
                      unitPrice: parseFloat(item?.listPrice || "0") || 0,
                      quantity: parseInt(item?.quantity || "1") || 1,
                      currency: "USD",
                    };
                  })
                  .filter(Boolean)
              : [],
          },
        });
      } catch (error) {
        // Silent fail for notification errors
      }
    };

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

      if (transaction?.status && typeof transaction?.orderAmount === "number" && transaction.orderAmount > 0) {
        try {
          isTrackerLoaded(() => {
            trackTransaction(transaction);
          });
        } catch (error) {
          // Silent fail for tracker errors
        }
      }
    });
  }
};

export default bigcommerceDataSource;
