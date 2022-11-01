import { errorTrackingSource } from "../sources/error-tracking-source";
import { postMessageSource } from "../sources/post-message-source";
import { QueryStringContext } from "../types";
import { tryParseJSONObject } from "../utils/try-parse-json";

interface CartEvent {
  sku: string;
  name: string;
  category: string;
  unitPrice: number;
  quantity: number;
  currency: string;
}

interface TransactionEvent {
  id: string;
  total: number;
  tax: number;
  shipping: number;
  city: string;
  state: string;
  country: string;
  currency: string;
  items: CartEvent[] & { transaction_id: string }[];
}

interface PlatformEvents {
  addToCartEvent: (cartEvent: CartEvent) => void;
  removeFromCartEvent: (cartEvent: CartEvent) => void;
  transactionEvent: (transactionEvent: TransactionEvent) => void;
}

const dutchieIframeEvents = ({ addToCartEvent, removeFromCartEvent, transactionEvent }: PlatformEvents) => {
  postMessageSource((event: MessageEvent<any>) => {
    const rawData = tryParseJSONObject(event.data);
    const payload = rawData?.payload?.payload || null;

    if (rawData.event === "analytics:dataLayer" && payload.event === "add_to_cart") {
      const products = payload.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      addToCartEvent({
        sku: item_id.toString(),
        name: (item_name || "N/A").toString(),
        category: (item_category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: "USD",
      });
    }

    if (rawData.event === "analytics:dataLayer" && payload.event === "remove_from_cart") {
      const products = payload.ecommerce.items;
      const { item_id, item_name, item_category, price, quantity } = products[0];

      removeFromCartEvent({
        sku: item_id.toString(),
        name: (item_name || "N/A").toString(),
        category: (item_category || "N/A").toString(),
        unitPrice: parseFloat(price || 0),
        quantity: parseInt(quantity || 1),
        currency: "USD",
      });
    }

    if (rawData.event == "analytics:dataLayer" && payload.event == "purchase") {
      const transaction = payload.ecommerce;
      const products = transaction.items;
      const { transaction_id, value } = transaction;

      transactionEvent({
        id: transaction_id.toString(),
        total: parseFloat(value || 0),
        tax: 0,
        shipping: 0,
        city: "N/A",
        state: "N/A",
        country: "N/A",
        currency: "USD",
        items: products.map((product) => {
          const { item_id, item_name, item_category, price, quantity } = product;

          return {
            transaction_id: transaction_id.toString(),
            sku: item_id.toString(),
            name: (item_name || "N/A").toString(),
            category: (item_category || "N/A").toString(),
            unitPrice: parseFloat(price || 0),
            quantity: parseInt(quantity || 1),
            currency: "USD",
          };
        }),
      });
    }
  });
};

export default dutchieIframeEvents;
