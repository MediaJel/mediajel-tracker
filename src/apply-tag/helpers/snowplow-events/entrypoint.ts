import { TagContext } from "../../../shared/types";

const entrypoint = ({
  collector,
  appId,
  retailId,
  event,
}: Pick<TagContext, "retailId" | "appId" | "collector" | "event">): Boolean => {

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

  // Loading tracker with the snowplow tag by fetching our sp.js file
  // Creates a global function called "tracker" which we use to access the Snowplow Tracker
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
    "tracker"
  );

  // Creates the tracker with the appId and sends events to collector url
  window.tracker("newTracker", "cnna", `${collector}`, {
    appId: appId,
    discoverRootDomain: true,
    stateStorageStrategy: "cookieAndLocalStorage",
    cookieSameSite: "Lax",
    respectDoNotTrack: true,
  });

  if(!event || !retailId) {
    window.tracker("trackPageView");
    window.tracker("enableActivityTracking", {
      minimumVisitLength: 30,
      heartbeatDelay: 10,
    });
  }

  window.tracker("enableFormTracking");
  window.tracker("enableLinkClickTracking");

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
  return true;
};

export default entrypoint;
