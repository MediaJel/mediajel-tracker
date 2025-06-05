import observable from "src/shared/utils/create-events-observable";

import { datalayerSource } from "../sources/google-datalayer-source";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import { xhrResponseSource } from "../sources/xhr-response-source";
import { TransactionCartItem } from "../types";

const tymberDataSource = () => {
  let success = false;
  datalayerSource((data: any) => {
    if (data.event === "addToCart") {
      const products = data.ecommerce.add.products;
      const currency = data.ecommerce.currency;
      const { brand, category, id, name, price, quantity } = products[0];

      observable.notify({
        addToCartEvent: {
          sku: id.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          unitPrice: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: (currency || "USD").toString(),
        },
      });
    }

    if (data.event === "removeFromCart") {
      const products = data.ecommerce.remove.products;
      const currency = data.ecommerce.currency;
      const { brand, category, id, name, price, quantity } = products[0];

      observable.notify({
        removeFromCartEvent: {
          sku: id.toString(),
          name: (name || "N/A").toString(),
          category: (category || "N/A").toString(),
          unitPrice: parseFloat(price || 0),
          quantity: parseInt(quantity || 1),
          currency: (currency || "USD").toString(),
        },
      });
    }

    if (data.event === "purchase") {
      try {
        const transaction = data.ecommerce.actionField;
        const products = data.ecommerce.products;
        const { id, revenue, tax } = transaction;

        observable.notify({
          enhancedTransactionEvent: {
            ids: [id.toString()],
            id: id.toString(),
            total: parseFloat(revenue),
            tax: parseFloat(tax),
            shipping: 0,
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: "USD",
            items: products.map((item) => {
              return {
                orderId: transaction.id.toString(),
                sku: item.id.toString(),
                name: (item.name || "N/A").toString(),
                category: (item.category || "N/A").toString(),
                unitPrice: parseFloat(item.price || 0),
                quantity: parseInt(item.quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });

        success = true;
      } catch (error) {
        // window.tracker('trackError', JSON.stringify(error), 'TYMBER');
      }
    }
  });

  if (!success) {
    const trackTransaction = (transaction) => {
      observable.notify({
        enhancedTransactionEvent: {
          ids: [transaction.orderId.toString()],
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
    };

    xhrResponseSource((xhr) => {
      try {
        const transaction = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));
        if (transaction.status && transaction.orderAmount > 0) {

          isTrackerLoaded(() => {
            trackTransaction(transaction);
          });
        }
      } catch (error) { }
    });
  }
};

export default tymberDataSource;
