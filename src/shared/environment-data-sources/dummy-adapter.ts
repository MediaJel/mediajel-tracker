import observable from "../utils/create-events-observable";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import dummyData from "../utils/dummyData";
import { TransactionCartItem } from "../types";
import { getAdapterHandler } from "../utils/adapter-handler";

const dummyDataSource = () => {
    const rawData = dummyData();
    const data = rawData[0];
    const items = data.items;
    const handler = getAdapterHandler();

    // Find a way to track if the transaction happened behind the scenes.
    handler.add("Data Cart #1", () => {
      if (data.cart === 1) {
        observable.notify({
            transactionEvent: {
              id: data.id,
              total: data.total,
              tax: data.tax,
              shipping: data.shipping,
              city: data.city,
              state: data.state,
              country: data.country,
              currency: data.currency,
              items: items.map((item) => {
                const { sku, name, category, unitPrice, quantity } = item;
                return {
                  orderId: data.id,
                  sku: sku,
                  name: name,
                  category: category,
                  unitPrice: unitPrice,
                  quantity: quantity,
                  currency: data.currency,
                } as TransactionCartItem;
              }),
            },
        });
        return true;
      }
      return false;
    });
    

    handler.add("Data Cart #2", () => {
      if (data.cart === 2) {
        observable.notify({
            transactionEvent: {
              id: data.id,
              total: data.total,
              tax: data.tax,
              shipping: data.shipping,
              city: data.city,
              state: data.state,
              country: data.country,
              currency: data.currency,
              items: items.map((item) => {
                const { sku, name, category, unitPrice, quantity } = item;
                return {
                  orderId: data.id,
                  sku: sku,
                  name: name,
                  category: category,
                  unitPrice: unitPrice,
                  quantity: quantity,
                  currency: data.currency,
                } as TransactionCartItem;
              }),
            },
        });
        return true;
      }
      return false;
    });

    isTrackerLoaded(() => handler.execute());
}

dummyDataSource();

export default dummyDataSource;