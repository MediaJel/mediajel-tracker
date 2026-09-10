import { guard } from "@mediajel/tracker-core/utils/guard";

export const xhrRequestSource = (callback: (xhrRequest: Document | XMLHttpRequestBodyInit) => void): void => {
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (data?: Document | XMLHttpRequestBodyInit | null) {
    // "load" fires once per completed request; "readystatechange" fired the
    // callback on every state transition, up to four times per request.
    this.addEventListener("load", guard(function () {
      if (data != null) callback(data); // Request Payload data
    }, "xhr-request"));
    send.call(this, data);
  };
};

export const formatXhrPayload = (data: Document | XMLHttpRequestBodyInit): unknown => {
  if (data instanceof FormData) {
      return Object.fromEntries(Array.from(data as unknown as Iterable<[string, string]>));
  }
  if (data instanceof URLSearchParams) {
      return Object.fromEntries(Array.from(data as unknown as Iterable<[string, string]>));
  }
  if (typeof data === "string") {
      try {
          return JSON.parse(data);
      } catch {
          return data;
      }
  }
  return data;
};
