export const xhrRequestSource = (callback: (xhrRequest: Document | XMLHttpRequestBodyInit) => void): void => {
  const send = XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.send = function (data) {
    this.addEventListener("readystatechange", function () {
      callback(data); // Request Payload data
    });
    send.apply(this, arguments);
  };
};
