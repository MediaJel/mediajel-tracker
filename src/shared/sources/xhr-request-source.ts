export const xhrRequestSource = (callback: (xhrRequest: Document | XMLHttpRequestBodyInit) => void): void => {
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (data) {
    this.addEventListener("readystatechange", function () {
      callback(data); // Request Payload data
    });
    send.apply(this, arguments);
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
