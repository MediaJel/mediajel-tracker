/**
 * ! Be very careful when using the fetch data source.
 * ! As poorly implementing it can cause a lot of issues on
 * ! the client side if errors are not handled correctly.
 *
 * @param requestCallback
 * @param responseCallback
 */

export const fetchSource = (
  requestCallback: (input: RequestInfo | URL, init?: RequestInit) => void,
  responseCallback: (response: Response) => void
): void => {
  const originalFetch = window.fetch;

  window.fetch = function (...args) {
    requestCallback(...args);
    return originalFetch(...args).then((response: Response) => {
      responseCallback(response.clone());
      return response;
    });
  };
};

export default fetchSource;
