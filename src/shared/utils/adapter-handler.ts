import logger from "src/shared/logger";
import observable from "./create-events-observable";
import { SnowplowTracker } from "../snowplow/types";

type HandlerFunction = () => void;

interface AdapterHandler {
    add: (name: string, fn: HandlerFunction) => void;
    execute: () => void;
}

export const createAdapterHandler = (snowplow: SnowplowTracker) => {
    const snowplowContext = snowplow.context.appId;
    const storageKey = `${snowplowContext}_transaction`;
    let successLogged = false;
    let counter = 0;
    const fns: Array<{ name: string; fn: HandlerFunction }> = [];

    function isUnique (name: string) {
        return fns.findIndex((fn) => fn.name === name) === -1;
    }

    const checkTransaction = () => {
        try {
            return !!sessionStorage.getItem(storageKey);
        } catch (error) {
            logger.error('Error checking transaction');
            return false;
        }
    }

    return {
        add: (name: string, fn: HandlerFunction) => {
            if (!isUnique(name)) {
                return;
            }
            fns.push({ name, fn });
        },
        execute: () => {
            if (counter === 1) return;
            if (successLogged || checkTransaction()) return;

            for (const { name, fn } of fns) {
                let success = false;
                observable.subscribe((event) => {
                    if (event.transactionEvent) success = true
                });

                try {
                    logger.info(`Attempting transaction with ${name}`);
                    fn();

                    if (success) {
                        successLogged = true;
                        logger.info(`Transaction successful with ${name}`);
                        return;
                    }
                } catch (error) {
                    logger.error(`Transaction Failed with ${name}`, error);
                }
            }
            counter++;

            if (!successLogged) {
                logger.error('All transaction attempts failed for the adapter.');
            }
        }
    } as AdapterHandler;
} 


export const multiAdapterHandler = (() => {
  let instance: ReturnType<typeof createAdapterHandler> | null = null;
  return (snowplow: SnowplowTracker) => {
    if (!instance) {
      instance = createAdapterHandler(snowplow);
    }
    return instance;
  };
})();

