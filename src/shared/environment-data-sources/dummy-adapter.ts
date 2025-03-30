import observable from "../utils/create-events-observable";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import dummyData from "../utils/dummyData";
import { TransactionCartItem } from "../types";

const dummyDataSource = () => {
    const data1 = dummyData();
    const rawData = dummyData();
    console.log("Data Value:", JSON.stringify(rawData[0], null, 2));
    console.log("Items Value:", rawData[0].items[0]);
    const data = rawData[0];
    const items = data.items;

    const trackData = () => {
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
        }
    }

    isTrackerLoaded(trackData);

}

dummyDataSource();

export default dummyDataSource;