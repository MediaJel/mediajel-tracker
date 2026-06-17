import logger from "@mediajel/tracker-core/logger";
import { guard } from "@mediajel/tracker-core/utils/guard";

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

  window.fetch = function (...args: [RequestInfo | URL, RequestInit?]): Promise<Response> {
    guard(requestCallback, "fetch-request")(...args);

    return originalFetch(...args)
      .then(async (response: Response) => {
        const clonedResponse = response.clone();
        const responseBody = await parseResponse(clonedResponse);
        guard(responseCallback, "fetch-response")(response, responseBody);
        return response;
      })
      .catch((error: Error) => {
        logger.error("Fetch error:", error);
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
