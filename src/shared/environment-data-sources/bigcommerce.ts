import { EnvironmentEvents, TransactionCartItem } from "../types";
import { xhrResponseSource } from "../sources/xhr-response-source";

const bigcommerceDataSource = ({ transactionEvent }: Partial<EnvironmentEvents>) => {
    xhrResponseSource((xhr) => {
        try {
            if (window.location.pathname.includes('/checkout')) {
                const transaction = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));
                const products = transaction?.lineItems?.physicalItems;
                if (transaction.hasOwnProperty("orderId")) {
                    if (transaction.isComplete === true) {
                        transactionEvent({
                            id: transaction.orderId.toString(),
                            total: parseFloat(transaction.orderAmount),
                            tax: parseFloat(transaction.taxTotal) || 0,
                            shipping: parseFloat(transaction.shippingCostTotal) || 0,
                            city: (transaction.billingAddress.city || "N/A").toString(),
                            state: (transaction.billingAddress.stateOrProvinceCode || "N/A").toString(),
                            country: (transaction.billingAddress.countryCode || "N/A").toString(),
                            currency: (transaction.currency.code || "USD").toString(),
                            items: products.map((product) => {
                                const { productId, sku, name, listPrice, quantity } = product;
                                return {
                                    orderId: transaction.orderId.toString(),
                                    productId: productId.toString(),
                                    sku: sku.toString(),
                                    name: (name || "N/A").toString(),
                                    category: "N/A",
                                    unitPrice: parseFloat(listPrice || 0),
                                    quantity: parseInt(quantity || 1),
                                    currency: (transaction.currency.code || "USD").toString(),
                                } as TransactionCartItem;
                            }),
                        });
                    }
                }
            }
        } catch (e) {
        }
    });
};

export default bigcommerceDataSource;
