import logger from "src/shared/logger";
import observable from "./create-events-observable";

type HandlerFunction = () => boolean;

interface AdapterHandler {
    add: (name: string, fn: HandlerFunction) => void;
    execute: () => void;
}

export const createAdapterHandler = () => {
    const storageKey = 'cnna_transaction_verified';
    let successLogged = false;
    const fns: Array<{ name: string; fn: HandlerFunction }> = [];

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
            fns.push({ name, fn });
        },
        execute: () => {
            if (successLogged || checkTransaction()) return;

            for (const { name, fn } of fns) {
                try {
                    logger.info(`Attempting transaction with ${name}`);
                    const success = fn();

                    if (success) {
                        sessionStorage.setItem(storageKey, 'true');
                        successLogged = true;
                        logger.info(`Transaction successful with ${name}`);
                        observable.notify({
                            adapterEvent: {
                                type: "transactionSuccess",
                                payload: { handlerName: name }
                            },
                        });
                        break;
                    }
                } catch (error) {
                    logger.error(`Transaction Failed with ${name}`, error);
                }
            }

            if (!successLogged) {
                logger.error("All transaction attempts failed for the adapter.");
                observable.notify({
                    adapterEvent: {
                        type: "transactionFailure",
                    },
                });
            }
        }
    } as AdapterHandler;
} 

let instance: AdapterHandler | null = null;
export const getAdapterHandler = () => {
    if (!instance) {
        instance = createAdapterHandler();
    }
    return instance;
}
