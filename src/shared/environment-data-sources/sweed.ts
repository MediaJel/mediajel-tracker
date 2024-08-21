import { datalayerSource } from "../sources/google-datalayer-source";
import { EnvironmentEvents, TransactionCartItem } from "../types";

const sweedDataSource = ({ transactionEvent }: Pick<EnvironmentEvents, "transactionEvent">) => {
    datalayerSource((data: any): void => {
        if (data.event === "purchase") {
            try {
                const transaction = data && data.ecommerce;
                const products = transaction.items;
                const { value, shipping, tax } = transaction;
                const transactionId = transaction && transaction.transaction_id && transaction.transaction_id.toString();
                transactionEvent({
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
                            unitPrice: parseFloat(price),
                        } as TransactionCartItem;
                    }),
                });
            } catch (error) {
            }
        }
    });
};

export default sweedDataSource;
