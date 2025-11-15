import observable from 'src/shared/utils/create-events-observable';
import { datalayerSource } from '../sources/google-datalayer-source';
import { TransactionCartItem } from '../types';

const foxyDataSource = () => {

    const runFoxy = () => {
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
                            couponCode: transaction?.coupon || "N/A",
                            discount: 0,
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

    datalayerSource(() => {
        runFoxy();
    });
};

export default foxyDataSource;