declare global {
    interface Window {
        trackTrans: () => void
    }
}

export const trackPurchase = (tracker: any = window.tracker): void => {
    const originalTracker = window.tracker;
    let transactionData: any = {};

    window.tracker = (...args: any): void => {
        const [action, orderId, total, ...rest] = args;
        if (action === "addTrans") {
            transactionData = {
                orderId,
                total,
                tax: rest[0],
                shipping: rest[1],
                city: rest[2],
                state: rest[3],
                country: rest[4],
                currency: rest[5],
            };
        }
        originalTracker(...args); // Call the original tracker
    };

    const nexxen = (args: any) => {
        window.cnnaSegments.nexxen.emitPurchase({
            cid: transactionData.orderId,
            bprice: transactionData.total,
        })
    }

    const dstillery = (args: any) => {
        window.cnnaSegments.dstillery.emitPurchase({
            orderId: transactionData.orderId,
            amount: transactionData.total,
        })
    }

    const segments = {
        nexxen,
        dstillery
    }

    const tracking = () = {
        window.tracker("trackTrans");
        segments
    };

    window.trackTrans = tracking;
}