/**
 * Read and parse an XHR's JSON body. Returns undefined — silently — for
 * non-text responseTypes (the responseText getter throws InvalidStateError),
 * non-JSON bodies, and non-object payloads: xhr sources see every request on
 * the host page, so none of that may produce a report or leak a response body.
 */
export const xhrJsonObject = (xhr: XMLHttpRequest): any => {
  try {
    const parsed = JSON.parse(xhr.responseText);
    return parsed && typeof parsed === "object" ? parsed : undefined;
  } catch {
    return undefined;
  }
};
