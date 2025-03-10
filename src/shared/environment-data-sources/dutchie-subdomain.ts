import logger from 'src/shared/logger';
import observable from 'src/shared/utils/create-events-observable';

import { datalayerSource } from '../sources/google-datalayer-source';
import { TransactionCartItem } from '../types';

// TODO: Create wrapper for handling multiple data sources configurations
const dutchieSubdomainDataSource = () => {
  datalayerSource((data) => {
    logger.debug("Dutchie Subdomain Data Source Events: ", { data });

    if (data.event === "add_to_cart") {
      const products = data.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      observable.notify({
        addToCartEvent: {
          sku: item_id.toString(),
          name: item_name?.toString() || "N/A",
          category: item_category?.toString() || "N/A",
          unitPrice: parseFloat(price || "0"),
          quantity: parseInt(quantity || "1"),
          currency: "USD",
        },
      });
    }

    if (data.event === "remove_from_cart") {
      const products = data.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      observable.notify({
        removeFromCartEvent: {
          sku: item_id.toString(),
          name: item_name?.toString() || "N/A",
          category: item_category?.toString() || "N/A",
          unitPrice: parseFloat(price || "0"),
          quantity: parseInt(quantity || "1"),
          currency: "USD",
        },
      });
    }

    if (data["0"] === "event" && data["1"] === "purchase") {
      const transaction = data["2"];
      const products = transaction.items;
      const { transaction_id, value } = transaction;

      observable.notify({
        transactionEvent: {
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
        },
      });
    }
    if (data.event === "purchase") {
      logger.info("Dutchie Transaction Event, Data Source: ", { data });

      const transaction = data.ecommerce;
      const products = transaction.items;
      const { transaction_id, value } = transaction;

      observable.notify({
        transactionEvent: {
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
        },
      });
    }

    if (data.event === "LB_Purchase") {
      logger.info("Dutchie Transaction Event, Data Source: ", { data });

      const products = data.items;
      const { transaction_id, transaction_total, transaction_tax } = data;

      observable.notify({
        transactionEvent: {
          total: parseFloat(transaction_total),
          id: transaction_id.toString(),
          tax: transaction_tax === "N/A" || isNaN(transaction_tax) ? 0 : parseFloat(transaction_tax),
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
              unitPrice: parseFloat(product.item_price || 0),
              quantity: parseInt(product.quantity || 1),
              currency: "USD",
            } as TransactionCartItem;
          }),
        },
      });
    }
  });
};

export default dutchieSubdomainDataSource;
