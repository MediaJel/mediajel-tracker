import logger from "src/shared/logger";

import { SnowplowTracker } from "../types";

export const withTransactionDeduplicationExtension = (snowplow: SnowplowTracker) => {
  const trackTransaction = snowplow.ecommerce.trackTransaction;

  snowplow.ecommerce.trackTransaction = (input) => {
    logger.debug("Triggering Transaction Deduplication Extension");
    const transactionStorage = localStorage.getItem(snowplow.context.appId);

    logger.debug("Transaction Storage", transactionStorage);

    if (transactionStorage === input.id) {
      return logger.warn(`Transaction with id ${input.id} already tracked`);
    }

    trackTransaction(input);
    localStorage.setItem(snowplow.context.appId, input.id);
  };
  return snowplow;
};
