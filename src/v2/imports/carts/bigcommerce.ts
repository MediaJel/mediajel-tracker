import { xhrResponseSource } from "../../../shared/sources/xhr-response-source";
import { QueryStringContext } from "../../../shared/types";

const bigcommerceTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
    xhrResponseSource((xhr) => {
        try {
            const transaction = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));
            const products = transaction?.lineItems?.physicalItems;

            const getLatestOrder = localStorage.getItem("latestOrder");
            if (transaction.hasOwnProperty("orderId")) {
                if (transaction.hasOwnProperty("status")) {
                    if (transaction.status === "AWAITING_FULFILLMENT") {
                        if (getLatestOrder !== transaction.orderId.toString()) {
                            window.tracker("addTrans", {
                                id: transaction.orderId.toString(),
                                affiliation:  retailId ?? appId,
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
                            localStorage.setItem("latestOrder", transaction.orderId.toString());
                        }
                    }
                }
            }
        } catch (e) {
        }
    });
};

export default bigcommerceTracker;
