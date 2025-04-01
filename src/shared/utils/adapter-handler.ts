import logger from "src/shared/logger";

export type TrackingFunction = (useCaseId: number, tracking: () => Promise<boolean> | boolean) => Promise<boolean>; 

export const createAdapterHandler = () => {
    const storageKey = 'cnna_transaction_verified';
    let successLogged = false;
    let pendingResponses = new Set<() => void>();
     const fns = []


     const add = (name: string, func: () => boolean) => fns.push({name, func})

     const execute = () => fns.map(({name, fn}) => {
        console.log(`Calling ${name} handler` )
        const isTracked = fn()
        isTracked && console.log(`Successfully tracked transaction with ${name} handler`)
        // How to evaluate if it succeeds
     })

    const hasTransaction = () => sessionStorage.getItem(storageKey) !== null;

    const cleanupPending = () => {
        pendingResponses.forEach(resolve => resolve());
        pendingResponses.clear();
    } 
    
    const track: TrackingFunction = async (useCaseId, tracking) => {
        if (hasTransaction()) return false;

        const result = await Promise.resolve(tracking());

        if (result) {
            sessionStorage.setItem(storageKey, 'true');
            successLogged = true;
            logger.info(`Adapter value ${useCaseId} was successful!`);
            cleanupPending();
            return true;
        }
        return false;
    }

    const finalCheck = async () => {
        await new Promise<void>(resolve => {
            pendingResponses.add(resolve);
            setTimeout(() => {
                pendingResponses.delete(resolve);
                resolve(null);
            }, 1000);
        });

        if (!successLogged && !hasTransaction()) {
            logger.error('All use cases failed');
        }
    };

    return { track, finalCheck, add, execute };
} 
