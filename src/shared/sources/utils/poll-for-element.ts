/*
 *   Waits for elements to be loaded in the DOM.
 *   It repeatedly checks if all the elements exist in the DOM.
 *   If all elements exist, it clears the interval and executes the provided callback function.
 */

export const pollForElement = (
  selectors: string[],
  callback: () => void,
  interval: number = 100,
  timeout: number = 30000
): void => {
  const startTime = Date.now();

  const poller = setInterval(() => {
    const elements = selectors.map((selector: string) => {
      const element = document.querySelector(selector);
      return element !== null;
    });

    const isAllLoaded = elements.every(Boolean);

    if (isAllLoaded) {
      clearInterval(poller);
      callback();
    } else if (Date.now() - startTime >= timeout) {
      clearInterval(poller);
      //console.error(`Timeout reached: elements with selectors "${selectors.join(", ")}" not found.`);
    }
  }, interval);
};
