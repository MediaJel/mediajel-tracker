import { Transactions } from "../shared/types";

const pageview = (context: Transactions) => {
  const { event, retailId } = context;

  // We only want to trigger pageviews for transaction without retailId and impression events
  if((event === "transaction" || event === "impression" || event === "pageview") && !retailId)
  {
    window.tracker("trackPageView");
    window.tracker("enableActivityTracking", {
      minimumVisitLength: 30,
      heartbeatDelay: 10,
    });

    // LiquidM Retargeting Pixel
    (function (c, d) {
      var a = document.createElement("script");
      a.type = "text/javascript";
      a.async = !0;
      a.src =
        "https://tracking.lqm.io/odin/handle_sync.js?seg=G8aqIT2yoccd7G3eEQ4uMw&gdpr=" +
        ("1" === c ? "1" : "0") +
        "&gdpr_consent=" +
        (d ? encodeURIComponent(d) : "") +
        "&cb=" +
        new Date().getTime();
      var b = document.getElementsByTagName("script")[0];
      b.parentNode.insertBefore(a, b);
    })();

    cookieSync();
  }

  return;
}

const cookieSync = () => {
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
    "https://sync.dmp.cnna.io/hash",
    "Hash"
  );

  return;
}

export default pageview;