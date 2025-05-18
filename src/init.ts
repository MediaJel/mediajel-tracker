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
    window._trackTransQueue = window._trackTransQueue || [];
  
    window.trackTrans = function() {
        window._trackTransQueue.push(arguments);
    };
  
    function initializeTracking() {
        window.trackTrans = function trackTrans(param) {
            window.trackTrans(param);
        };
        
        while (window._trackTransQueue.length > 0) {
            var args = window._trackTransQueue.shift();
            window.trackTrans.apply(null, args);
        }
    }

    if (typeof window.trackTrans === 'function') {
        initializeTracking();
    } else {
        pollForFunction(['trackTrans'], () => {
            initializeTracking();
        }, 100, 10000); // dunno if this will cause lag
    }
})();