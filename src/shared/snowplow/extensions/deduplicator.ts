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

  const deduplicateEvent = <T>(originalMethod: (input: T) => void, eventType: string, input: T, idField: keyof T) => {
    const storageKey = getStorageKey(eventType);
    const eventId = input[idField];
    const storedId = sessionStorage.getItem(storageKey);

    if (storedId === eventId) {
      logger.warn(`${eventType} with id ${eventId} already tracked. Discarding duplicate event.`);
      return;
    }

    originalMethod(input);
    sessionStorage.setItem(storageKey, eventId as string);
  };

  snowplow.ecommerce.trackTransaction = (input) =>
    deduplicateEvent(originalTrackTransaction, "transaction", input, "id");

  snowplow.ecommerce.trackAddToCart = (input) =>
    // ! PLEASE UPDATE THE "NAME"
    deduplicateEvent(originalTrackAddToCart, "addToCart", input, "name");

  snowplow.ecommerce.trackRemoveFromCart = (input) =>
    // ! PLEASE UPDATE THE "NAME"
    deduplicateEvent(originalTrackRemoveFromCart, "removeFromCart", input, "name");

  snowplow.trackSignup = (input) => deduplicateEvent(originalTrackSignup, "signUp", input, "uuid");

  return snowplow;
};

export default withDeduplicationExtension;
