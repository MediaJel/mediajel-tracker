import { xhrResponseSource } from "../../../shared/sources/xhr-response-source";
import { QueryStringContext } from "../../../shared/types";

const bigcommerceTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
    xhrResponseSource((xhr) => {
        try {
            console.log('v2', xhr);
            const transaction = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));
            const products = transaction?.lineItems?.physicalItems;
            let latestOrder = null;
            if (transaction.hasOwnProperty("orderId")) {
                if (transaction.hasOwnProperty("status")) {
                    console.log('status v2', transaction.status);
                    if (transaction.status === "AWAITING_FULFILLMENT") {
                        console.log("completed status validation")
                        if (latestOrder !== transaction.orderId.toString()) {
                            console.log("completed transaction validation");
                            console.log('transactions in here: ', transaction);
                            window.tracker("addTrans", {
                                id: transaction.orderId.toString(),
                                affiliation: "N/A",
                                total: parseFloat(transaction.orderAmount),
                                tax: parseFloat(transaction.taxTotal) || 0,
                                shipping: parseFloat(transaction.shippingCostTotal) || 0,
                                city: (transaction.billingAddress.city || "N/A").toString(),
                                state: (transaction.billingAddress.stateOrProvinceCode || "N/A").toString(),
                                country: (transaction.billingAddress.countryCode || "N/A").toString(),
                                currency: "USD",
                            });
                            products.forEach((item, index) => {
                                window.tracker("addItem", {
                                    orderId: transaction.orderId.toString(),
                                    productId: item.productId.toString(),
                                    sku: item.sku.toString(),
                                    name: (item.name || "N/A").toString(),
                                    category: "N/A",
                                    unitPrice: parseFloat(item.listPrice || 0),
                                    quantity: parseInt(item.quantity || 1),
                                    currency: "USD",
                                });
                            });
                            window.tracker("trackTrans");
                            console.log('end');
                            latestOrder.push(transaction.orderId.toString())
                        }
                    }
                }
            }

        } catch (e) {
            console.log('warning: ', e);
        }
    });
};

export default bigcommerceTracker;
