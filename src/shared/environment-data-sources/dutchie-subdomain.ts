import { datalayerSource } from "../sources/google-datalayer-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const dutchieSubdomainDataSource = ({
  addToCartEvent,
  removeFromCartEvent,
  transactionEvent,
}: Partial<EnvironmentEvents>) => {
  datalayerSource((data) => {
    if (data.event === "add_to_cart") {
      const products = data.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      addToCartEvent?.({
        sku: item_id.toString(),
        name: item_name?.toString() || "N/A",
        category: item_category?.toString() || "N/A",
        unitPrice: parseFloat(price || "0"),
        quantity: parseInt(quantity || "1"),
        currency: "USD",
      });
    }

    if (data.event === "remove_from_cart") {
      const products = data.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      removeFromCartEvent?.({
        sku: item_id.toString(),
        name: item_name?.toString() || "N/A",
        category: item_category?.toString() || "N/A",
        unitPrice: parseFloat(price || "0"),
        quantity: parseInt(quantity || "1"),
        currency: "USD",
      });
    }

    if (data["0"] === "event" && data["1"] === "purchase") {
      const transaction = data["2"];
      const products = transaction.items;
      const { transaction_id, value } = transaction;

      transactionEvent?.({
        total: parseFloat(value),
        id: transaction_id.toString(),
        tax: 0,
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
        items: products.map((product) => {
          return {
            orderId: transaction_id.toString(),
            sku: product.item_id.toString(),
            name: product.item_name?.toString() || "N/A",
            category: product.item_category?.toString() || "N/A",
            unitPrice: parseFloat(product.price || "0"),
            quantity: parseInt(product.quantity || "1"),
            currency: "USD",
          } as TransactionCartItem;
        }),
      });
    } else if (data.event === "purchase") {
      const transaction = data.ecommerce;
      const products = transaction.items;
      const { transaction_id, value } = transaction;

      transactionEvent?.({
        total: parseFloat(value),
        id: transaction_id.toString(),
        tax: 0,
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
        items: products.map((product) => {
          return {
            orderId: transaction_id.toString(),
            sku: product.item_id.toString(),
            name: product.item_name?.toString() || "N/A",
            category: product.item_category?.toString() || "N/A",
            unitPrice: parseFloat(product.price || "0"),
            quantity: parseInt(product.quantity || "1"),
            currency: "USD",
          } as TransactionCartItem;
        }),
      });
    }
  });
};

export default dutchieSubdomainDataSource;
