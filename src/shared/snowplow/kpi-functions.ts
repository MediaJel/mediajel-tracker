import { createLogger } from "../logger";
import { EnhancedTransactionEvent } from "../types";


export const KPIallocator = (tracker) => {
    const logger = createLogger("KPIallocator");
    window.trackTrans = (data: EnhancedTransactionEvent, version?: number | string) => {
    if (version === 2 || version === "2") {
      tracker.ecommerce.enhancedTransaction(data);
      logger.info("Using enhanced transaction tracking for version 2");
    } else {
      tracker.ecommerce.trackTransaction;
    }
  }

  window.trackSignUp = tracker.trackSignup;
  window.addToCart = tracker.ecommerce.trackAddToCart;
  window.removeFromCart = tracker.ecommerce.trackRemoveFromCart;
}