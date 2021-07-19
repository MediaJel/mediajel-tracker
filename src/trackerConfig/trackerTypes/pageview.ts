import { PageviewContext } from "../../interface";

export default function pageview(context: PageviewContext): Boolean {
  const { retailId, appId, collector } = context;

  if (location.href.includes(retailId) || !retailId) {
    (function (e, o, n, t, a, c, i) {
      if (!e[a]) {
        e.GlobalSnowplowNamespace = e.GlobalSnowplowNamespace || [];
        e.GlobalSnowplowNamespace.push(a);
        e[a] = function () {
          (e[a].q = e[a].q || []).push(arguments);
        };
        e[a].q = e[a].q || [];
        c = o.createElement(n);
        i = o.getElementsByTagName(n)[0];
        c.async = 1;
        c.src = t;
        i.parentNode.insertBefore(c, i);
      }
    })(
      window,
      document,
      "script",
      "//dm2q9qfzyjfox.cloudfront.net/sp.js",
      "appId"
    );
    window.appId("newTracker", "cf", `${collector}`, {
      appId,
      discoverRootDomain: true,
      stateStorageStrategy: "localStorage",
      respectDoNotTrack: true,
    });
    window.appId("enableActivityTracking", 30, 10);
    window.appId("trackPageView");
    window.appId("enableLinkClickTracking");
    setTimeout(
      function (e, o, n, t, a, c, i) {
        if (!e[a]) {
          e.GlobalSnowplowNamespace = e.GlobalSnowplowNamespace || [];
          e.GlobalSnowplowNamespace.push(a);
          e[a] = function () {
            (e[a].q = e[a].q || []).push(arguments);
          };
          e[a].q = e[a].q || [];
          c = o.createElement(n);
          i = o.getElementsByTagName(n)[0];
          c.decoding = "async";
          c.src = t;
          c.height = 0;
          c.width = 0;
          c.border = 0;
        }
      },
      1e3,
      window,
      document,
      "img",
      "https://sync.dmp.cnna.io/cs",
      "Sync"
    );
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
      "https://sync.dmp.mediajel.ninja/hash",
      "Hash"
    );
  }
  return true;
}
