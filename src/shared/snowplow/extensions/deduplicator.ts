import { SnowplowTracker } from '../types';

export const withTransactionDeduplicationExtension = (snowplow: SnowplowTracker) => {
    
    const trackTransaction = snowplow.ecommerce.trackTransaction;

    snowplow.ecommerce.trackTransaction = (input) => {
        const transactionStorage = localStorage.getItem(snowplow.context.appId);
        
        if (transactionStorage === input.id) {
            return;
        }

        trackTransaction(input);
        localStorage.setItem(snowplow.context.appId, input.id);
    }
    return snowplow;
}