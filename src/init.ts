export const pollForFunction = (
  functionNames: string[],
  callback: () => void,
  interval: number = 100,
  timeout: number = 30000
): void => {
  const startTime = Date.now();

  const poller = setInterval(() => {
    const functionExists = functionNames.map((fnName: string) => {
      return typeof (window as any)[fnName] === 'function';
    });

    const areAllFunctionsLoaded = functionExists.every(Boolean);

    if (areAllFunctionsLoaded) {
      clearInterval(poller);
      callback();
    } else if (Date.now() - startTime >= timeout) {
      clearInterval(poller);
    }
  }, interval);
};

(function() {
  interface TransactionEvent {
    id: string;
    affiliateId?: string;
    total: number;
    tax: number;
    shipping: number;
    city: string;
    state: string;
    country: string;
    currency: string;
    userId?: string;
    items: {
      sku: string;
      name: string;
      category: string;
      unitPrice: number;
      quantity: number;
      currency: string;
      orderId: string;
      userId?: string;
    }[];
  }

  window._trackTransQueue = window._trackTransQueue || [] as TransactionEvent[];
  
  window.trackTrans = function(event: TransactionEvent) {
    window._trackTransQueue.push(event);
  };

  //! We can't poll for trackTrans because we have a stub called trackTrans and it'll create a stack overflow 
  pollForFunction(['tracker'], () => {
    while (window._trackTransQueue.length > 0) {
      const event = window._trackTransQueue.shift()!; // Non-null assertion operator, don't remove, makes sure we don't get undefined
      window.trackTrans(event);
    }
  }, 100, 10000);
})();