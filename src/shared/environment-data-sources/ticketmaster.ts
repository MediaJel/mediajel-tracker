import observable from 'src/shared/utils/create-events-observable';
import { datalayerSource } from '../sources/google-datalayer-source';
import { TransactionCartItem } from '../types';

const ticketMasterDataSource = () => {

    let hasTransaction = false;

    const runTicketMaster = () => {
        if (window.location.pathname.includes("/receipt") || window.location.pathname.includes("/checkout")) {
            window.dataLayer = window.dataLayer || [];
            for (let i = 0; i < window.dataLayer.length; i++) {
                const dataCart = window.dataLayer[i];

                if (dataCart["0"] === "event" && dataCart["1"] === "purchase") {
                    const transaction = dataCart["2"];
                    const products = transaction.items;
                    const transaction_id = transaction.transaction_id;
                    const valueTransaction = transaction.value || 0;
                    const shippingFee = transaction.shipping || 0;
                    const taxFee = transaction.tax || 0;

                    observable.notify({
                        transactionEvent: {
                            total: parseFloat(valueTransaction),
                            id: transaction_id.toString(),
                            tax: parseFloat(taxFee) || 0,
                            shipping: parseFloat(shippingFee) || 0,
                            city: "N/A",
                            state: "N/A",
                            country: "N/A",
                            currency: "USD",
                            items: products.map((product) => {
                                var item_id = product.item_id,
                                    item_name = product.item_name,
                                    item_category = product.item_category,
                                    price = product.price,
                                    quantity = product.quantity;

                                return {
                                    orderId: transaction_id.toString(),
                                    sku: item_id.toString(),
                                    name: item_name?.toString() || "N/A",
                                    category: item_category?.toString() || "N/A",
                                    unitPrice: parseFloat(price || 0),
                                    quantity: parseInt(quantity || 1),
                                    currency: "USD",
                                } as TransactionCartItem;
                            }),
                        }
                    });

                    break;
                }
                if (dataCart.event === "purchase") {
                    const transaction = dataCart.ecommerce;
                    const products = transaction.items;
                    const { transaction_id, value, tax, shipping } = transaction;

                    observable.notify({
                        transactionEvent: {
                            total: parseFloat(value || 0) + parseFloat(tax || 0) + parseFloat(shipping || 0),
                            id: transaction_id.toString(),
                            tax: parseFloat(tax) || 0,
                            shipping: parseFloat(shipping) || 0,
                            city: "N/A",
                            state: "N/A",
                            country: "N/A",
                            currency: "USD",
                            items: products.map((product) => {
                                var item_id = product.item_id,
                                    item_name = product.item_name,
                                    item_category = product.item_category,
                                    price = product.price,
                                    quantity = product.quantity;

                                return {
                                    orderId: transaction_id.toString(),
                                    sku: item_id.toString(),
                                    name: item_name?.toString() || "N/A",
                                    category: item_category?.toString() || "N/A",
                                    unitPrice: parseFloat(price || 0),
                                    quantity: parseInt(quantity || 1),
                                    currency: "USD",
                                } as TransactionCartItem;
                            }),
                        }
                    });

                    break;
                }
            }
        }
    }



    datalayerSource((data) => {
        // option 1
        runTicketMaster();

        // option 2
        if (data[1] === 'purchase') {
            const transaction = data[2];
            const items = transaction.items;

            observable.notify({
                transactionEvent: {
                    total: parseFloat(transaction),
                    id: transaction.transaction_id.toString(),
                    tax: 0,
                    shipping: 0,
                    city: "N/A",
                    state: "N/A",
                    country: "USA",
                    currency: "USD",
                    items: items.map((item) => {

                        return {
                            orderId: transaction.transaction_id.toString(),
                            sku: item.item_id || "N/A",
                            name: item.item_name,
                            category: item.item_category || "N/A",
                            unitPrice: parseFloat(item.price || 0),
                            quantity: parseInt(item.quantity || 1),
                            currency: "USD",
                        } as TransactionCartItem;
                    }),
                }
            });

            hasTransaction = true;
        }
    });
};

export default ticketMasterDataSource;