import logger from "src/shared/logger";

export type TrackingFunction = (useCaseId: number, tracking: () => Promise<boolean> | boolean) => Promise<boolean>; 

export const createAdapterHandler = () => {
    const storageKey = 'cnna_transaction_verified';
    let successLogged = false;
    let pendingResponses = new Set<() => void>();

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

    return { track, finalCheck };
} 
