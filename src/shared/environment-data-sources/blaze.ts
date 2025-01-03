import observable from 'src/shared/utils/create-events-observable';
import { xhrResponseSource } from "../sources/xhr-response-source";
import { TransactionCartItem } from '../types';

const blazeDataSource = () => {
    const runBlaze = () => {
        xhrResponseSource((xhr) => {
            try {
                const getData = JSON.parse(xhr.responseText);
                if (getData.data.type === "orders") {

                    const transaction = getData.data.attributes;

                    const amount = (transaction.total.amount / 100).toString();
                    const tax = (transaction.tax_total.amount / 100).toString();
                    const products = getData.included;
                    const address = transaction.delivery_address;

                    observable.notify({
                        transactionEvent: {
                            id: transaction.order_number.toString(),
                            total: parseFloat(amount) || 0,
                            tax: parseFloat(tax) || 0,
                            shipping: 0,
                            city: (address.city || "N/A").toString(),
                            state: (address.state || "N/A").toString(),
                            country: (address.country || "N/A").toString(),
                            currency: "USD",
                            items: products
                                .filter((product) => product.type === "order_items")
                                .map((product) => {
                                    const price = product.attributes.final_price.amount;
                                    return {
                                        orderId: transaction.order_number.toString(),
                                        sku: product.id.toString(),
                                        name: "N/A",
                                        category: "N/A",
                                        unitPrice: price / 100 || 0,
                                        quantity: parseInt(product.attributes.quantity || 1),
                                        currency: "USD",
                                    } as TransactionCartItem;
                                }),
                        },
                    });
                }
            }
            catch (error) { }
        });
    }

    runBlaze();
};

export default blazeDataSource;