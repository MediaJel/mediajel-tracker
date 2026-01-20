import { datalayerSource } from "src/shared/sources/google-datalayer-source";
import observable from "src/shared/utils/create-events-observable";

import { TransactionCartItem } from "../types";

const dutchiePlusDataSource = () => {
  // IMPORTANT NOTE: dutchieplus cart CURALEAF is Paid search only & greenvalleydispensary is display
  window.dataLayer = window.dataLayer || [];

  datalayerSource((data) => {
    //* Works on Curaleaf
    if (data.event === "purchase") {
      observable.notify({
        transactionEvent: {
          id: data.ecommerce.transaction_id,
          total: parseFloat(data.ecommerce.value),
          tax: parseFloat(data.ecommerce.tax || 0),
          shipping: parseFloat(data.ecommerce.shipping || 0),
          city: "N/A",
          country: "USA",
          currency: "USD",
          state: "N/A",
          items: data.ecommerce.items.map((item) => {
            return {
              orderId: data.ecommerce.transaction_id,
              sku: item.item_id,
              name: item.item_name,
              category: item.item_category,
              unitPrice: parseFloat(item.price),
              quantity: parseInt(item.quantity),
              currency: "USD",
            } as TransactionCartItem;
          }),
        },
      });
    }

    if (data.event === "add_to_cart") {
      const products = data.ecommerce.items;
      const { item_id, item_name, item_category, full_price, quantity } = products[0];

      observable.notify({
        addToCartEvent: {
          sku: item_id.toString(),
          name: item_name?.toString() || "N/A",
          category: item_category?.toString() || "N/A",
          unitPrice: parseFloat(full_price || "0"),
          quantity: parseInt(quantity || "1"),
          currency: "USD",
        },
      });
    }

    if (data.event === "remove_from_cart") {
      const products = data.ecommerce.items;
      const { item_id, item_name, item_category, full_price, quantity } = products[0];

      observable.notify({
        removeFromCartEvent: {
          sku: item_id.toString(),
          name: item_name?.toString() || "N/A",
          category: item_category?.toString() || "N/A",
          unitPrice: parseFloat(full_price || "0"),
          quantity: parseInt(quantity || "1"),
          currency: "USD",
        },
      });
    }
  });

  // if window.locatoin.href includes 'order-confirmation'
  // if (!window.location.href.includes("order-confirmation")) {
  //   return;
  // }

  // loop through the dataLayer and find the purchase event
  for (let i = 0; i < window.dataLayer.length; i++) {
    const data = window.dataLayer[i];
    if (data.event === "purchase") {
      // const orderContent: HTMLDivElement | any = document.getElementsByClassName("order-content")[0];
      // const text: string = orderContent?.innerText;
      // const regex = /#(\d+)/;
      // const orderNumber = text.match(regex)[1];

      // if (localStorage.getItem("orderNumber") === orderNumber) {
      //   return;
      // }

      // // set order id to local storage to prevent duplicate events
      // localStorage.setItem("orderNumber", orderNumber);

      const items = data?.ecommerce?.purchase?.products || data?.ecommerce?.items;

      const getId = data?.ecommerce?.purchase?.actionField?.id || data?.ecommerce?.transaction_id;
      const getRevenue = data?.ecommerce?.purchase?.actionField?.revenue || data?.ecommerce?.value;
      const getTax = data?.ecommerce?.purchase?.actionField?.tax || data?.ecommerce?.tax;
      const additionalIds = data?.ecommerce?.product_ids || [];

      if (getId) {
        observable.notify({
          transactionEvent: {
            total: parseFloat(getRevenue),
            id: getId,
            tax: parseFloat(getTax || 0),
            shipping: 0,
            city: "N/A",
            state: "N/A",
            country: "USA",
            currency: "USD",
            alternativeTransactionIds: additionalIds,
            items: items.map((item) => {
              return {
                orderId: getId,
                sku: item.id || item.item_id,
                name: item.name || item.item_name,
                category: item.category || item.item_category,
                unitPrice: parseFloat(item.price),
                quantity: parseInt(item.quantity),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      }
    }

    if (data[1] === "purchase") {
      try {
        const transactionData = data[2];
        const items = transactionData.items;

        observable.notify({
          transactionEvent: {
            total: parseFloat(transactionData.value),
            id: transactionData.rawData.orderNumber,
            tax: parseFloat(transactionData.tax || 0),
            shipping: parseFloat(transactionData.shipping || 0),
            city: transactionData.city || "N/A",
            state: transactionData.state || "N/A",
            country: "USA",
            currency: "USD",
            items: items.map((item) => {
              return {
                orderId: transactionData.rawData.orderNumber,
                sku: item.item_id,
                name: item.item_name || "N/A",
                category: item.item_category || "N/A",
                unitPrice: parseFloat(item.price || 0),
                quantity: parseInt(item.quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {
        // window.tracker('trackError', JSON.stringify(error), 'DUTCHIEPLUS');
      }
    }
  }
};

export default dutchiePlusDataSource;
