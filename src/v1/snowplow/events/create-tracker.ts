import { QueryStringContext } from "../../../shared/types";

const createTracker = (context: QueryStringContext): void => {
  const { appId, collector } = context;

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
  })(window, document, "script", "//dm2q9qfzyjfox.cloudfront.net/sp.js", "tracker");

  // Creates the tracker with the appId and sends events to collector url
  window.tracker("newTracker", "cnna", `${collector}`, {
    appId: appId,
    discoverRootDomain: true,
    stateStorageStrategy: "cookieAndLocalStorage",
    cookieSameSite: "Lax",
    respectDoNotTrack: true,
    eventMethod: "post",
  });

  window.tracker("enableActivityTracking", 30, 10);
  window.tracker("trackPageView");
  window.tracker("enableFormTracking");
  window.tracker("enableLinkClickTracking");
};

export default createTracker;
