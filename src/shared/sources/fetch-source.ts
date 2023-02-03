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
