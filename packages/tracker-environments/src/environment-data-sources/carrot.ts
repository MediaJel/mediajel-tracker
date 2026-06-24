import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { isTrackerLoaded } from "@mediajel/tracker-core/sources/utils/is-tracker-loaded";
import { TransactionCartItem } from "@mediajel/tracker-core/types";
import { fetchSource } from "@mediajel/tracker-core/sources/fetch-source";
import { multiAdapterHandler } from "@mediajel/tracker-core/utils/adapter-handler";
import { SnowplowTracker } from "@mediajel/tracker-core/snowplow/types";
import logger from "@mediajel/tracker-core/logger";

const carrotDataSource = (snowplow: SnowplowTracker) => {
  const handler = multiAdapterHandler(snowplow);

  handler.add("Fetch Response Source", () => {
    fetchSource(
      (request) => {},
      (response, responseBody) => {
        if (!window.location.href.includes("/store/activity")) return;
        if (!responseBody) return;

        responseBody?.orders?.forEach((order) => {
          if (order?.details?.status === "open") {
            const data = order;
            try {
              isTrackerLoaded(() => {
                observable.notify({
                  transactionEvent: {
                    id: data.details.id || "N/A",
                    total: parseFloat(data.details.total || 0),
                    tax: parseFloat(data.details.tax || 0),
                    shipping: 0,
                    city: "N/A",
                    state: "N/A",
                    country: "USA",
                    currency: "USD",
                    items:
                      data.items.map((item) => {
                        return {
                          orderId: data.details.id || "N/A",
                          sku: item.product.id.toString() || "N/A",
                          name: (item.product.name || "N/A").toString(),
                          category: (item.product.categoryName || "N/A").toString(),
                          unitPrice: parseFloat(item.price) || 0,
                          quantity: parseInt(item.unitQty) || 1,
                          currency: "USD",
                        } as TransactionCartItem;
                      }) || [],
                  },
                });
              });
            } catch (error) {
              logger.error("Carrot: Error parsing response body", error);
            }
          }
        });
      },
    );
  });
  handler.execute();
};

export default carrotDataSource;
