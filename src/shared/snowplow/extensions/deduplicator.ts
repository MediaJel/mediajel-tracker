import { SnowplowTracker } from '../types';

export const withTransactionDeduplicationExtension = (snowplow: SnowplowTracker) => {
    
    const trackTransaction = snowplow.ecommerce.trackTransaction;

    snowplow.ecommerce.trackTransaction = (input) => {
        localStorage.setItem(snowplow.context.appId, "");
        const transactionStorage = localStorage.getItem(snowplow.context.appId);
        console.log("Verifying Transaction Count");
        console.log("Storage Pre-Value: ", transactionStorage);
        
        if (transactionStorage === input.id) {
            console.log("Cache detected duplicated transaction, skipping...");
            return;
        }

        console.log("Transaction Verified, Initiating Tracking...");
        trackTransaction(input);
        localStorage.setItem(snowplow.context.appId, input.id);
        console.log("Storage Post-Value: ", transactionStorage);
    }
    return snowplow;
}