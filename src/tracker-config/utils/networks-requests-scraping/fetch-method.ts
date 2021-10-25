(function (ns, fetch) {
  if (typeof fetch !== "function") return;

  ns.fetch = function () {
    var out = fetch.apply(this, arguments);

    out.then(async (response) => {
      const clone = response.clone();
      await clone.text().then((res) => console.log(res));
    });

    return out;
  };
})(window, window.fetch);