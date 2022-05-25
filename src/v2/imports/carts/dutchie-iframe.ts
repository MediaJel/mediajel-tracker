import { QueryStringContext } from "../../../shared/types";
import { tryParseJSONObject } from "../../../shared/utils/try-parse-json";

const dutchieIframeTracker = ({
    appId,
    retailId,
}: Pick<QueryStringContext, "appId" | "retailId">): void => {
    const receiveMessage = (event: MessageEvent<any>): void => {
        try {
            const rawData = tryParseJSONObject(event.data);
            const payload = rawData.payload.payload;

            if (rawData.event === "analytics:dataLayer" && payload.event === "add_to_cart") {
                const products = payload.ecommerce.items;
                const { item_id, item_name, item_category, price, quantity } = products[0];

                window.tracker(
                    "trackAddToCart",
                    item_id.toString(),
                    (item_name || "N/A").toString(),
                    (item_category || "N/A").toString(),
                    parseFloat(price || 0),
                    parseInt(quantity || 1),
                    "USD"
                );
            }

            if (rawData.event === "analytics:dataLayer" && payload.event === "remove_from_cart") {
                const products = payload.ecommerce.items;
                const { item_id, item_name, item_category, price, quantity } = products[0];

                window.tracker(
                    "trackRemoveFromCart",
                    item_id.toString(),
                    (item_name || "N/A").toString(),
                    (item_category || "N/A").toString(),
                    parseFloat(price || 0),
                    parseInt(quantity || 1),
                    "USD"
                );
            }

            if (rawData.event == "analytics:dataLayer" && payload.event == "purchase") {
                const transaction = payload.ecommerce;
                const products = transaction.items;
                const { transaction_id, value } = transaction;

                // Hardcoded because most fields are empty
                window.tracker(
                    "addTrans",
                    transaction_id.toString(),
                    retailId ?? appId,
                    parseFloat(value),
                    0,
                    0,
                    "N/A",
                    "N/A",
                    "N/A",
                    "USD"
                );

                products.forEach(items => {
                    const { item_id, item_name, item_category, price, quantity } = items;

                    window.tracker(
                        "addItem",
                        transaction_id.toString(),
                        item_id.toString(),
                        (item_name || "N/A").toString(),
                        (item_category || "N/A").toString(),
                        parseFloat(price || 0),
                        parseInt(quantity || 1),
                        "USD"
                    );
                })

                window.tracker("trackTrans");
            }
        }
        catch (e) {
            throw e;
        }
    }

    window.addEventListener("message", receiveMessage, false);
};

export default dutchieIframeTracker;
