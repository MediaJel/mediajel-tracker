import logger from 'src/shared/logger';
import { SnowplowTracker } from '../types';

const withDeduplicationExtension = (snowplow: SnowplowTracker) => {
  const { 
    trackTransaction: originalTrackTransaction,
    trackAddToCart: originalTrackAddToCart,
    trackRemoveFromCart: originalTrackRemoveFromCart
  } = snowplow.ecommerce;
  
  const { trackSignup: originalTrackSignup } = snowplow;

  const getStorageKey = (eventType: string) => 
    `${snowplow.context.appId}_${eventType}`;

  const deduplicateEvent = (
    originalMethod: (input: any) => void,
    eventType: string,
    input: any,
    idField: string = 'id'
  ) => {
    const storageKey = getStorageKey(eventType);
    const eventId = input[idField];
    const storedId = sessionStorage.getItem(storageKey);

    if (storedId === eventId) {
      logger.warn(`${eventType} with id ${eventId} already tracked. Discarding duplicate event.`);
      return;
    }

    originalMethod(input);
    sessionStorage.setItem(storageKey, eventId);
  };

  snowplow.ecommerce.trackTransaction = (input) => 
    deduplicateEvent(originalTrackTransaction, 'transaction', input);

  snowplow.ecommerce.trackAddToCart = (input) => 
    deduplicateEvent(originalTrackAddToCart, 'addToCart', input);

  snowplow.ecommerce.trackRemoveFromCart = (input) => 
    deduplicateEvent(originalTrackRemoveFromCart, 'removeFromCart', input);

  snowplow.trackSignup = (input) => 
    deduplicateEvent(originalTrackSignup, 'signUp', input, 'uuid');

  return snowplow;
};

export default withDeduplicationExtension;