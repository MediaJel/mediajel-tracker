import { createLogger } from "src/shared/logger";
import { TransactionEventVariation } from "src/shared/types";
import { SnowplowTracker, SnowplowTrackerEcommerceEvents } from "../snowplow";

export function assignGlobalTrackers(tracker: SnowplowTracker & { ecommerce }) { //eccomerce: SnowplowTrackerEcommerceEvents
    const logger = createLogger("assignGlobalTrackers");
    window.trackSignUp = tracker.trackSignup;
    window.addToCart = tracker.ecommerce.trackAddToCart;
    window.removeFromCart = tracker.ecommerce.trackRemoveFromCart;

    window.trackTrans = (data: TransactionEventVariation, version): TransactionEventVariation => {
        if (version === 2 || version === "2") {
            logger.info("Using enhanced transaction tracking");
            tracker.ecommerce.trackEnhancedTransaction(data);
        } else {
            logger.info("Using legacy transaction tracking");
            tracker.ecommerce.trackTransaction(data);
        }
        return data;
    };
}
