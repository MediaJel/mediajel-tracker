import { xhrResponseSource } from "../../../shared/sources/xhr-response-source";
import { QueryStringContext } from "../../../shared/types";

const bigcommerceTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
    xhrResponseSource((xhr) => {
        try {
            //let intervalId = window.setInterval(function () {
            console.log("Running");
            const transaction = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));
            if (transaction.hasOwnProperty("orderId")) {
               // if (window.location.pathname.includes('/checkout/order-confirmation')) {
                    console.log('xhr', xhr);
                    console.log('transaction', transaction);
                    const products = transaction?.lineItems?.physicalItems;

                    window.tracker("setUserId", transaction.billingAddress.email.toString());
                    window.tracker("addTrans", {
                        id: transaction.orderId.toString(),
                        affiliation: retailId ?? appId,
                        total: parseFloat(transaction.orderAmount),
                        tax: parseFloat(transaction.taxTotal) || 0,
                        shipping: parseFloat(transaction.shippingCostTotal) || 0,
                        city: (transaction.billingAddress.city || "N/A").toString(),
                        state: (transaction.billingAddress.stateOrProvinceCode || "N/A").toString(),
                        country: (transaction.billingAddress.countryCode || "N/A").toString(),
                        currency: (transaction.currency.code || "USD").toString(),
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
                            currency: (transaction.currency.code || "USD").toString(),
                        });
                    });
                    window.tracker("trackTrans");

                    //clearInterval(intervalId); // This will stop the setInterval
                //}
            }
            //}, 2000);
        } catch (e) {
        }
    });
};

export default bigcommerceTracker;
