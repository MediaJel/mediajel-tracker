import observable from "src/shared/utils/create-events-observable";

import { datalayerSource } from "../sources/google-datalayer-source";
import { TransactionCartItem } from "../types";

const yotpoDataSource = () => {
  datalayerSource((data: any) => {
    // do not  remove commented code
    // if (data.event === "addToCart") {
    //   const products = data.ecommerce.add.products;
    //   const currency = data.ecommerce.currency;
    //   const { brand, category, id, name, price, quantity } = products[0];

    //   addToCartEvent({
    //     sku: id.toString(),
    //     name: (name || "N/A").toString(),
    //     category: (category || "N/A").toString(),
    //     unitPrice: parseFloat(price || 0),
    //     quantity: parseInt(quantity || 1),
    //     currency: (currency || "USD").toString(),
    //   });
    // }

    // if (data.event === "removeFromCart") {
    //   const products = data.ecommerce.remove.products;
    //   const currency = data.ecommerce.currency;
    //   const { brand, category, id, name, price, quantity } = products[0];

    //   removeFromCartEvent({
    //     sku: id.toString(),
    //     name: (name || "N/A").toString(),
    //     category: (category || "N/A").toString(),
    //     unitPrice: parseFloat(price || 0),
    //     quantity: parseInt(quantity || 1),
    //     currency: (currency || "USD").toString(),
    //   });
    // }

    if (data.event === "purchase") {
      try {
        const transaction = data.ecommerce;
        const products = data.ecommerce.items;
        const { transaction_id, value, tax } = transaction;
        observable.notify({
          transactionEvent: {
            id: transaction_id.toString(),
            total: parseFloat(value),
            tax: parseFloat(tax),
            shipping: 0,
            city: "N/A",
            state: "N/A",
            country: "N/A",
            currency: "USD",
            items: products.map((item) => {
              return {
                orderId: transaction_id.toString(),
                sku: item.item_id.toString(),
                name: (item.item_name || "N/A").toString(),
                category: (item.item_category || "N/A").toString(),
                unitPrice: parseFloat(item.price || 0),
                quantity: parseInt(item.quantity || 1),
                currency: "USD",
              } as TransactionCartItem;
            }),
          },
        });
      } catch (error) {
        // window.tracker('trackError', JSON.stringify(error), 'YOTPO');
      }
    }
  });
};

export default yotpoDataSource;
