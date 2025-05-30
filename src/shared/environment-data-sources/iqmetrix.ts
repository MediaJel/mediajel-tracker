import observable from "src/shared/utils/create-events-observable";

import { xhrResponseSource } from "../sources/xhr-response-source";
import { TransactionCartItem } from "../types";

const iqmetrixDataSource = () => {
    xhrResponseSource((xhr: XMLHttpRequest) => {
        const response = xhr.responseText;
        try {
            const transaction = JSON.parse(response);
            if (transaction.data.orderStatus.includes("Ordered")) {

                const product = transaction.data.productDetails;

                observable.notify({
                    enhancedTransactionEvent: {
                        ids: [transaction.data.orderDisplayId.toString()],
                        id: transaction.data.orderDisplayId.toString(),
                        city: "N/A",
                        country: "USA",
                        currency: "USD",
                        shipping: parseFloat(transaction.data.deliveryCharge) || 0,
                        state: "N/A",
                        tax: parseFloat(transaction.data.tax) || 0,
                        total: parseFloat(transaction.data.grandTotal) || 0,
                        items: product.map((item: any) => {
                            return {
                                orderId: transaction.data.orderDisplayId.toString(),
                                category: "N/A",
                                currency: "USD",
                                name: item.productName.toString(),
                                quantity: parseInt(item.selectQuantity),
                                sku: item.Id.toString(),
                                unitPrice: parseFloat(item.price),
                            } as TransactionCartItem;
                        }),
                    },
                });
            }
        } catch (error) {
            // window.tracker('trackError', JSON.stringify(error), 'IQMETRIX');
        }
    });
};

export default iqmetrixDataSource;