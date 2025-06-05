import observable from "src/shared/utils/create-events-observable";
import { SnowplowTracker } from "src/shared/snowplow/types";
import { datalayerSource } from "../sources/google-datalayer-source";
import { TransactionCartItem } from "../types";
import { multiAdapterHandler } from "../utils/adapter-handler";

const FlowhubDataSource = (snowplow: SnowplowTracker) => {
    const handler = multiAdapterHandler(snowplow);

    handler.add("Google Data Layer Source #1", () => {
        datalayerSource((data: any) => {
            if (data.event === "purchase") {
                console.log("Purchase Event: ", data);
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
                    console.log("Log Warn Purchase Event: ", error);
                }
            }
        });
    });

    handler.execute();
};

export default FlowhubDataSource;
