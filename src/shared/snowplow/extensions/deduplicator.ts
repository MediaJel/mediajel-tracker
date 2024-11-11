import logger from 'src/shared/logger';

import { SnowplowTracker } from '../types';

/**
 * *This extension will prevent duplicate events (I.E. transactions) from being tracked
 * TODO: Add appId to appropriate events
 * TODO: Implement deduplication for other events (remove from cart, add to cart, etc.)
 */
const withTransactionDeduplicationExtension = (snowplow: SnowplowTracker) => {
  const trackTransaction = snowplow.ecommerce.trackTransaction;

  snowplow.ecommerce.trackTransaction = (input) => {
    const transactionStorage = sessionStorage.getItem(snowplow.context.appId);

    if (transactionStorage === input.id) {
      return logger.warn(`Transaction with id ${input.id} already tracked, Disccarding duplicate transaction`);
    }

    trackTransaction(input);
    sessionStorage.setItem(snowplow.context.appId, input.id);
  };
  return snowplow;
};

export default withTransactionDeduplicationExtension;
