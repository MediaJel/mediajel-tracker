import { EnvironmentEvents } from "../types";
import { TransactionCartItem } from "/src/snowplow";
import { tryParseJSONObject } from "../utils/try-parse-json";

const ecwidTracker = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
  if (!window.transactionOrder && !window.transactionItems) {
    return;
  }

  const transaction = tryParseJSONObject(window.transactionOrder);
  const products = tryParseJSONObject(window.transactionItems);

  transactionEvent({
    id: transaction.id.toString(),
    total: parseFloat(transaction.total),
    tax: parseFloat(transaction.tax) || 0,
    shipping: parseFloat(transaction.delivery_fee) || 0,
    city: "N/A",
    state: "N/A",
    country: "USA",
    currency: "USD",
    items: products.map((product) => {
      const { item_id, item_name, item_category, price, quantity } = product;
      return {
        orderId: transaction.id.toString(),
        productId: item_id.toString(),
        sku: item_id.toString(),
        name: (item_name || "N/A").toString(),
        category: (item_category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: "USD",
      } as TransactionCartItem;
    }),
  });
};

export default ecwidTracker;
