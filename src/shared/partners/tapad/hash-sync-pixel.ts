export const tapadHashSyncPixel = () => {
  setTimeout(
    function (p, l, o, w, i, n, g) {
      if (!p[i]) {
        p.GlobalSnowplowNamespace = p.GlobalSnowplowNamespace || [];
        p.GlobalSnowplowNamespace.push(i);
        p[i] = function () {
          (p[i].q = p[i].q || []).push(arguments);
        };
        p[i].q = p[i].q || [];
        n = l.createElement(o);
        g = l.getElementsByTagName(o)[0];
        n.decoding = "async";
        n.src = w;
        n.height = 0;
        n.width = 0;
        n.border = 0;
      }
    },
    1000,
    window,
    document,
    "img",
    "https://sync.dmp.cnna.io/hash",
    "Hash"
  );
};
