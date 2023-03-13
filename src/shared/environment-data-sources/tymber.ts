import { datalayerSource } from "../sources/google-datalayer-source";
import { EnvironmentEvents } from "../types";
import { TransactionCartItem } from "/src/snowplow";

const tymberDataSource = ({ addToCartEvent, removeFromCartEvent, transactionEvent }: Partial<EnvironmentEvents>) => {
  datalayerSource((data: any) => {
    if (data.event === "addToCart") {
      const products = data.ecommerce.add.products;
      const currency = data.ecommerce.currency;
      const { brand, category, id, name, price, quantity } = products[0];

      addToCartEvent({
        sku: id.toString(),
        name: (name || "N/A").toString(),
        category: (category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: (currency || "USD").toString(),
      });
    }

    if (data.event === "removeFromCart") {
      const products = data.ecommerce.remove.products;
      const currency = data.ecommerce.currency;
      const { brand, category, id, name, price, quantity } = products[0];

      removeFromCartEvent({
        sku: id.toString(),
        name: (name || "N/A").toString(),
        category: (category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: (currency || "USD").toString(),
      });
    }

    if (data.event === "purchase") {
      const transaction = data.ecommerce.actionField;
      const products = data.ecommerce.products;
      const { id, revenue, tax } = transaction;

      transactionEvent({
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
      });
    }
  });
};

export default tymberDataSource;
