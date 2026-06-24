import logger from "@mediajel/tracker-core/logger";
import observable from "@mediajel/tracker-core/utils/create-events-observable";
import { SnowplowTracker } from "@mediajel/tracker-core/snowplow/types";
import { datalayerSource } from "@mediajel/tracker-core/sources/google-datalayer-source";
import { TransactionCartItem } from "@mediajel/tracker-core/types";
import { multiAdapterHandler } from "@mediajel/tracker-core/utils/adapter-handler";

const FlowhubDataSource = (snowplow: SnowplowTracker) => {
    const handler = multiAdapterHandler(snowplow);

    handler.add("Google Data Layer Source #1", () => {
        datalayerSource((data: any) => {
            if (data.event === "purchase") {
                logger.debug("Purchase Event: ", data);
                try {
                    const transaction = data && data.ecommerce;
                    const products = transaction.items;
                    const { value, shipping, tax } = transaction;
                    const transactionId = transaction && transaction.transaction_id && transaction.transaction_id.toString();

                    observable.notify({
                        transactionEvent: {
                            id: transactionId,
                            total: parseFloat(value),
                            tax: parseFloat(tax),
                            city: "N/A",
                            country: "USA",
                            currency: "USD",
                            shipping: shipping,
                            state: "N/A",
                            items: products.map((items: any) => {
                            const { item_id, item_name, item_category, price, quantity } = items;
                                return {
                                    orderId: transactionId,
                                    category: item_category,
                                    currency: "USD",
                                    name: item_name,
                                    quantity,
                                    sku: item_id,
                                    unitPrice: parseFloat(price) || 0,
                                } as TransactionCartItem;
                            }),
                        },
                    });
                } catch (error) {
                    logger.debug("Log Warn Purchase Event: ", error);
                }
            }
        });
    });

    handler.execute();
};

export default FlowhubDataSource;
