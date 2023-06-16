import { xhrResponseSource } from "../../../shared/sources/xhr-response-source";
import { QueryStringContext } from "../../../shared/types";

const bigcommerceTracker = ({ appId, retailId }: Pick<QueryStringContext, "appId" | "retailId">) => {
    xhrResponseSource((xhr) => {
        try {
            console.log('xhr', xhr);
            if (window.location.pathname.includes('/checkout/order-confirmation')) {
                const transaction = JSON.parse(JSON.stringify(JSON.parse(xhr.responseText)));
                const products = transaction.lineItems.physicalItems;
                console.log('transaction', transaction);
                console.log('orderId',transaction.hasOwnProperty("orderId"));
                if (transaction.hasOwnProperty("orderId")) {
                    window.tracker("setUserId", transaction.billingAddress.email.toString());
                    window.tracker(
                        "addTrans",
                        transaction.orderId,
                        retailId ?? appId,
                        transaction.orderAmount,
                        transaction.taxTotal || 0,
                        transaction.shippingCostTotal || 0,
                        transaction.billingAddress.city || "N/A",
                        transaction.billingAddress.stateOrProvinceCode || "N/A",
                        transaction.billingAddress.countryCode || "USA",
                        transaction.currency.code,
                    );
                    products.forEach((item, index) => {
                        window.tracker(
                            "addItem",
                            item.productId,
                            item.sku,
                            item.name,
                            "N/A",
                            item.listPrice,
                            item.quantity,
                            transaction.currency.code,
                        );
                    });
                    window.tracker("trackTrans");
                }
            }
        } catch (e) {
        }
    });
};

export default bigcommerceTracker;
