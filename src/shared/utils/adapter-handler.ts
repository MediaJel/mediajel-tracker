import logger from "src/shared/logger";
import observable from "./create-events-observable";
import { getStorageKey } from "../snowplow/extensions/deduplicator";

type HandlerFunction = () => void;

interface AdapterHandler {
    add: (name: string, fn: HandlerFunction) => void;
    execute: () => void;
}

export const createAdapterHandler = () => {
    const storageKey = 'cnna_transaction_verified';
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
                        sessionStorage.setItem(storageKey, 'true');
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
                logger.error('Transaction Failed');
            }
        }
    } as AdapterHandler;
} 


export const createAdapterHandlerSingleton = (() => {
  let instance: ReturnType<typeof createAdapterHandler> | null = null;
  return () => {
    if (!instance) {
      instance = createAdapterHandler();
    }
    return instance;
  };
})();

