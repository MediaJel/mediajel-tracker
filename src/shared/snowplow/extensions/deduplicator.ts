import { createLogger } from "src/shared/logger";
import { SnowplowTracker } from "../types";

const withDeduplicationExtension = (snowplow: SnowplowTracker) => {
  const logger = createLogger("MJ:Deduplication");
  const {
    trackTransaction: originalTrackTransaction,
    trackAddToCart: originalTrackAddToCart,
    trackRemoveFromCart: originalTrackRemoveFromCart,
  } = snowplow.ecommerce;

  const { trackSignup: originalTrackSignup } = snowplow;

  const getStorageKey = (eventType: string) => `${snowplow.context.appId}_${eventType}`;

  const deduplicateEvent = <T>(originalMethod: (input: T) => void, eventType: string, input: T, idField: (keyof T)[]) => {
    const storageKey = getStorageKey(eventType);
    const eventId = idField.map((key) => input[key]).join(':');
    
    let previousIds: string[] = [];
    try {
      const storedValue = localStorage.getItem(storageKey);
      if (storedValue) {
        const parsed = JSON.parse(storedValue);
        
        if (Array.isArray(parsed)) {
          previousIds = parsed.filter(id => typeof id === 'string');
        } else if (typeof parsed === 'string') {
          previousIds = [parsed];
        } else {
          logger.warn(`Invalid stored IDs format for ${eventType}, resetting to empty array`);
        }
      }
    } catch (e) {
      logger.error(`Failed to parse stored IDs for ${eventType}:`, e);
      previousIds = [];
    }

    if (previousIds.includes(eventId)) {
      logger.warn(`${eventType} with id ${eventId} already tracked. Discarding duplicate event.`);
      return;
    }

    originalMethod(input);
    
    const updatedIds = [...previousIds, eventId];
    localStorage.setItem(storageKey, JSON.stringify(updatedIds));
  };

  snowplow.ecommerce.trackTransaction = (input) =>
    deduplicateEvent(originalTrackTransaction, "transaction", input, ["id"]);

  snowplow.ecommerce.trackAddToCart = (input) =>
    deduplicateEvent(originalTrackAddToCart, "addToCart", input, ["name", "quantity"]);

  snowplow.ecommerce.trackRemoveFromCart = (input) =>
    deduplicateEvent(originalTrackRemoveFromCart, "removeFromCart", input, ["name", "quantity"]);

  snowplow.trackSignup = (input) => deduplicateEvent(originalTrackSignup, "signUp", input, ["uuid", "emailAddress"]);

  return snowplow;
};

export default withDeduplicationExtension;