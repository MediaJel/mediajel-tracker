import observable from "../utils/create-events-observable";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import { datalayerSource } from "../sources/google-datalayer-source";
import { TransactionCartItem } from "../types";
import { multiAdapterHandler } from "../utils/adapter-handler";
import { SnowplowTracker } from "../snowplow/types";

const evenueDataSource = (snowplow: SnowplowTracker) => {
  const handler = multiAdapterHandler(snowplow);

  handler.add("DataLayer Source", () => {
    isTrackerLoaded(() => {
      datalayerSource((data) => {
        if (data.event === "purchase") {
          const purchase = data?.ecommerce?.items;

          observable.notify({
            transactionEvent: {
              id: data.transaction_id,
              total: parseFloat(data.value) || 0,
              tax: 0,
              shipping: parseFloat(data.shipping) || 0,
              discount: 0,
              couponCode: "N/A",
              city: "N/A",
              state: "N/A",
              country: "USA",
              currency: "USD",
              items:
                purchase?.map((item) => {
                  return {
                    orderId: data.transaction_id,
                    sku: item.item_id.toString() || "N/A",
                    name: item.item_name.toString() || "N/A",
                    category: item.item_category.toString() || "N/A",
                    unitPrice: parseFloat(item.price) || 0,
                    quantity: parseInt(item.quantity) || 1,
                    currency: "USD",
                  } as TransactionCartItem;
                }) || [],
            },
          });
        }
      });
    });
  });

  handler.execute();
};

export default evenueDataSource;
