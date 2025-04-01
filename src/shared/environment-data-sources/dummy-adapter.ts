import observable from "../utils/create-events-observable";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import dummyData from "../utils/dummyData";
import { TransactionCartItem } from "../types";
import { createAdapterHandler } from "../utils/adapter-handler";

const dummyDataSource = () => {
    const rawData = dummyData();
    const data = rawData[0];
    const items = data.items;
    const handler = createAdapterHandler();

    handler.add("Google Data Layer", () => {
      return false
    })
    
    handler.add("Network request", () => {

      return true // for tracking transaction
    })

    isTrackerLoaded(() => handler.execute())


    const trackData1 = () => {
        handler.track(1, () => {
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
    }

    const trackData2 = () => {
        handler.track(2, () => {
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
    }

    isTrackerLoaded(trackData1);
    isTrackerLoaded(trackData2);

}

dummyDataSource();

export default dummyDataSource;