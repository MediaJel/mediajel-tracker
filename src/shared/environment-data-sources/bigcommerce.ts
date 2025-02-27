import observable from "src/shared/utils/create-events-observable";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import { xhrResponseSource } from "../sources/xhr-response-source";
import { TransactionCartItem } from "../types";

const bigcommerceDataSource = () => {
  let success = false;

  xhrResponseSource((xhr) => {
    let transaction;
    try {
      transaction = JSON.parse(xhr.responseText);
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
          items: products?.map((product) => {
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
      success = true;
    } catch (e) {
      // Silent fail for notification errors
    }
  });

  if (!success) {
    const trackTransaction = (transaction) => {
      try {
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
            items: transaction?.lineItems?.physicalItems?.map((item) => ({
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
      } catch (error) {
        // Silent fail for notification errors
      }
    };

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
