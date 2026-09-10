import { notifyError } from "@mediajel/tracker-core/sources/error-tracking-source";
import observable from "@mediajel/tracker-core/utils/create-events-observable";

import { xhrResponseSource } from "@mediajel/tracker-core/sources/xhr-response-source";
import { xhrJsonObject } from "@mediajel/tracker-core/utils/xhr-json";
import { TransactionCartItem } from "@mediajel/tracker-core/types";

const iqmetrixDataSource = () => {
    xhrResponseSource((xhr: XMLHttpRequest) => {
        const transaction = xhrJsonObject(xhr);
        if (!transaction) return;

        try {
            // Optional chaining: this source sees every XHR on the page, so JSON that
            // isn't an iQmetrix order must skip silently, not report a TypeError.
            if (transaction.data?.orderStatus?.includes("Ordered")) {

                const product = transaction.data.productDetails;

                observable.notify({
                    transactionEvent: {
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
            notifyError(error, "iqmetrix");
        }
    });
};

export default iqmetrixDataSource;