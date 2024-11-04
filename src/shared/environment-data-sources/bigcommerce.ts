import observable from "src/shared/utils/create-events-observable";

import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import { xhrResponseSource } from "../sources/xhr-response-source";
import { TransactionCartItem } from "../types";

// TODO: Remove the success evaluation, doesn't really do anything
const bigcommerceDataSource = () => {
  let success = false;

  xhrResponseSource((xhr) => {
    //if (window.location.pathname.includes('/checkout')) {
    const transaction = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));
    const products = transaction?.lineItems?.physicalItems;
    const getLatestOrder = localStorage.getItem("latestOrder");
    if (transaction.hasOwnProperty("orderId")) {
      if (transaction.hasOwnProperty("status")) {
        if (transaction.status === "AWAITING_FULFILLMENT") {
          if (getLatestOrder !== transaction?.orderId.toString()) {
            try {
              observable.notify({
                transactionEvent: {
                  id: transaction?.orderId.toString(),
                  total: parseFloat(transaction?.orderAmount),
                  tax: parseFloat(transaction?.taxTotal) || 0,
                  shipping: parseFloat(transaction?.shippingCostTotal) || 0,
                  city: (transaction?.billingAddress?.city || "N/A").toString(),
                  state: (transaction?.billingAddress?.stateOrProvinceCode || "N/A").toString(),
                  country: (transaction?.billingAddress?.countryCode || "N/A").toString(),
                  currency: "USD",
                  items: products.map((product) => {
                    const { sku, name, listPrice, quantity } = product;
                    return {
                      orderId: transaction?.orderId?.toString(),
                      sku: sku.toString(),
                      name: (name || "N/A").toString(),
                      category: "N/A",
                      unitPrice: parseFloat(listPrice || 0),
                      quantity: parseInt(quantity || 1),
                      currency: "USD",
                    } as TransactionCartItem;
                  }),
                },
              });
            } catch (e) {
              // window.tracker("trackError", JSON.stringify(e), "BIGCOMMERCE");
            }
            localStorage.setItem("latestOrder", transaction.orderId.toString());
            success = true;
          }
        }
      }
    }
    //}
  });

  if (!success) {
    const trackTransaction = (transaction) => {
      try {
        observable.notify({
          transactionEvent: {
            id: transaction.orderId.toString(),
            total: parseFloat(transaction.orderAmount),
            tax: parseFloat(transaction.taxTotal) || 0,
            shipping: parseFloat(transaction.shippingCostTotal) || 0,
            city: (transaction.billingAddress.city || "N/A").toString(),
            state: (transaction.billingAddress.stateOrProvinceCode || "N/A").toString(),
            country: (transaction.billingAddress.countryCode || "N/A").toString(),
            currency: "USD",
            items: transaction.lineItems.physicalItems.map((item) => {
              return {
                orderId: transaction.orderId.toString(),
                sku: item.sku.toString(),
                name: (item.name || "N/A").toString(),
                category: "N/A",
                unitPrice: parseFloat(item.listPrice || 0),
                quantity: parseInt(item.quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {}
    };

    xhrResponseSource((xhr) => {
      const transaction = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));
      if (transaction.status && transaction.orderAmount > 0) {
        try {
          isTrackerLoaded(() => {
            trackTransaction(transaction);
          });
        } catch (error) {}
      }
    });
  }
};

export default bigcommerceDataSource;
