import { createLogger } from "src/shared/logger";
import { EnhancedTransactionEvent } from "src/shared/types";
import { SnowplowTracker, SnowplowTrackerEcommerceEvents } from "../snowplow";

export function assignGlobalTrackers(tracker: SnowplowTracker & { ecommerce: SnowplowTrackerEcommerceEvents }) {
    const logger = createLogger("assignGlobalTrackers");
    window.trackSignUp = tracker.trackSignup;
    window.addToCart = tracker.ecommerce.trackAddToCart;
    window.removeFromCart = tracker.ecommerce.trackRemoveFromCart;

    window.trackTrans = (data: EnhancedTransactionEvent) => {
        logger.info("trackTrans called with data: ", data);
        //! TODO: Map data to correct fields 
        
        tracker.ecommerce.trackEnhancedTransaction({
            ids: data.ids || [data.id],
            id: data.id,
            affiliateId: data.affiliateId,
            total: data.total,
            tax: data.tax,
            shipping: data.shipping,
            discount: data.discount,
            coupon_code: data.coupon_code,
            payment_method: data.payment_method,
            total_quantity: data.total_quantity,
            city: data.city,
            state: data.state,
            country: data.country,
            currency: data.currency,
            items: data.items.map(item => ({
                orderId: item.orderId,
                sku: item.sku,
                name: item.name,
                category: item.category,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                currency: item.currency,
            })),
        });
    };
}
