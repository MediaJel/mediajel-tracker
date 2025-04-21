import logger from "src/shared/logger";
import { SnowplowTracker } from "../types";

const withDeduplicationExtension = (snowplow: SnowplowTracker) => {
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
    const storedId = localStorage.getItem(storageKey);

    if (storedId === eventId) {
      logger.warn(`${eventType} with id ${eventId} already tracked. Discarding duplicate event.`);
      return;
    }

    originalMethod(input);
    localStorage.setItem(storageKey, eventId as string);
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
