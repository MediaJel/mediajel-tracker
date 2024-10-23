import logger from 'src/shared/logger';

import { xhrResponseSource } from '../sources/xhr-response-source';
import { EnvironmentEvents, TransactionCartItem } from '../types';
import { isTrackerLoaded } from '../sources/utils/is-tracker-loaded';
import { runOncePerPageLoad } from '../sources/utils/trans-deduplicator';

const magentoDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  window.dataLayer = window.dataLayer || [];

  for (let i = 0; i < window.dataLayer.length; i++) {
    const data = window.dataLayer[i];

    if(data.event === "purchase") {
      const ecommerce = data.ecommerce;

      isTrackerLoaded(() => { 
        runOncePerPageLoad(() => {
          transactionEvent({
            id: ecommerce.transaction_id.toString(),
            total: parseFloat(ecommerce.value),
            tax: parseFloat(ecommerce.tax) || 0,
            shipping: parseFloat(ecommerce.shipping) || 0,
            city: "N/A",
            country: "USA",
            currency: "USD",
            state: "N/A",
            items: ecommerce.items.map((item: any) => {
              return {
                orderId: ecommerce.transaction_id.toString(),
                sku: item.id.toString(),
                name: (item.name || "N/A").toString(),
                category: (item.category || "N/A").toString(),
                unitPrice: parseFloat(item.price || 0),
                quantity: parseInt(item.quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          });
          sessionStorage.setItem("key", "loaded");
        });
      });
    }
  }

  if(!sessionStorage.getItem("key")) {
    xhrResponseSource((xhr) => {
      try {
        const getData = JSON.parse(xhr.responseText);

        const products = getData && getData.items;

        if (products !== undefined || products.length !== 0) {
          const dataToJSON = JSON.stringify(getData);
          sessionStorage.setItem("pixelData", dataToJSON);
        }
      } catch (e) {}
    });

    if (window.location.pathname.includes("/checkout/onepage/success/") || 
      window.location.pathname.includes("/success/")) {
      setTimeout(() => {
        try {
          const storedData = sessionStorage.getItem("pixelData");
          const retrievedObject = JSON.parse(storedData);
          const productsList = retrievedObject && retrievedObject.items;

          const checkoutSuccessElement = document.querySelector(".checkout-success");
          const orderNumberElement = checkoutSuccessElement.querySelector("span");
          const orderNumber = orderNumberElement.textContent.trim();

          transactionEvent({
            id: orderNumber,
            total: parseFloat(retrievedObject.base_grand_total),
            tax: parseFloat(retrievedObject.base_tax_amount) || 0,
            shipping: parseFloat(retrievedObject.base_shipping_amount) || 0,
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: "USD",
            items: productsList.map((product) => {
              const { item_id, name, price, qty } = product;
              return {
                orderId: orderNumber.toString(),
                productId: item_id.toString(),
                sku: item_id.toString(),
                name: (name || "N/A").toString(),
                category: "N/A",
                unitPrice: parseFloat(price || 0),
                quantity: parseInt(qty || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          });
        } catch (error) {
          // window.tracker("trackError", JSON.stringify(error), "MAGENTO");
        }
        sessionStorage.setItem("pixelData", "0");
      }, 1000);
    }
  }

  if(sessionStorage.getItem("key")) {
    sessionStorage.removeItem("key");
  }

};

export default magentoDataSource;
