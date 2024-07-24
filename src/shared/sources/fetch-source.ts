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
  responseCallback: (response: Response, responseBody: any) => void
): void => {
  const originalFetch = window.fetch;

  window.fetch = function (...args: [RequestInfo, RequestInit?]): Promise<Response> {
    requestCallback(...args);

    return originalFetch(...args)
      .then(async (response: Response) => {
        const clonedResponse = response.clone();
        const responseBody = await parseResponse(clonedResponse);
        responseCallback(response, responseBody);
        return response;
      })
      .catch((error: Error) => {
        console.error("Fetch error:", error);
        throw error;
      });
  };
};

const parseResponse = async (response: Response): Promise<any> => {
  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await response.json();
  } else {
    return await response.text();
  }
};

export default fetchSource;
