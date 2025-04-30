import { createLogger } from "src/shared/logger";
import { SnowplowTracker } from "src/shared/snowplow/types";

/**
 * This extension ensures that pre-requisite rules are applied before tracking events.
 * This will allow us to be strict in filtering out events that are not valid.
 * */
const withEventRules = (snowplow: SnowplowTracker) => {
    const trackTransaction = snowplow.ecommerce.trackTransaction;
    const logger = createLogger("snowplow-event-rules");
    logger.info("Event rules extension loaded");

    if (trackTransaction) {
        console.log("Tracking transaction value: ", trackTransaction);
    }
    snowplow.ecommerce.trackTransaction = (input) => {
        logger.info("Inside event rules");

        logger.info("Input value pero eventrules: ", typeof input.id);

        logger.info("Version: ", snowplow.context.version);

        if (snowplow.context.version == "1" && typeof input.id !== "string") {
            logger.warn("Tracker supports version 1, transaction event is triggered incorrectly. Please use positional arguments.");
            return;
        }

        if (snowplow.context.version == "2" && typeof input.id !== "object") {
            logger.warn("Tracker supports version 2, transaction event is triggered incorrectly. Please use object-based arguments.");
            return;
        }

        if (!input.id) {
            logger.warn("Transaction event is missing id. Discarding event.");
            return;
        }

        if (!input.total) {
            logger.warn("Transaction event is missing total. Discarding event.");
            return;

        }

        trackTransaction(input);
    };

    return snowplow;
}

export default withEventRules;