import logger from "src/shared/logger";
import { TransactionEventVariation } from "src/shared/types";
import { SnowplowTracker } from "../snowplow";

export function assignGlobalTrackers(tracker: SnowplowTracker & { ecommerce }) {
  window.trackSignUp = tracker.trackSignup;
  window.addToCart = tracker.ecommerce.trackAddToCart;
  window.removeFromCart = tracker.ecommerce.trackRemoveFromCart;

  window.trackTrans = (data: TransactionEventVariation, version): TransactionEventVariation => {
    if (version === 2 || version === "2") {
      tracker.ecommerce.trackEnhancedTransaction(data);
      logger.info("Using enhanced transaction tracking for version 2");
    } else {
      tracker.ecommerce.trackTransaction(data);
    }
    return data;
  };
}
