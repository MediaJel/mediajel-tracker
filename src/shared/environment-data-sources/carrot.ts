import observable from "src/shared/utils/create-events-observable";
import { isTrackerLoaded } from "../sources/utils/is-tracker-loaded";
import { TransactionCartItem } from "../types";
import { fetchSource } from "../sources/fetch-source";
import { multiAdapterHandler } from "../utils/adapter-handler";
import { SnowplowTracker } from "../snowplow/types";
import logger from "src/shared/logger";

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
