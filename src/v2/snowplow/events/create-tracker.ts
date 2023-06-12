import { QueryStringContext } from "../../../shared/types";

const createTracker = ({ appId, collector, event }: QueryStringContext): void => {
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
  })(window, document, "script", "//mj-snowplow-static-js.s3.amazonaws.com/cnna.js", "tracker");
  window.tracker("newTracker", "cf", collector, {
    appId,
    postPath: '/analytics/track',
    discoverRootDomain: true,
    stateStorageStrategy: "cookieAndLocalStorage",
    cookieSameSite: "Lax",
    respectDoNotTrack: false,
    eventMethod: "post",
  });
  window.tracker("enableActivityTracking", {
    minimumVisitLength: 30,
    heartbeatDelay: 10,
  });
  window.tracker("trackPageView");
  window.tracker("enableFormTracking");
  window.tracker("enableErrorTracking", {
    filter: (errorEvent: ErrorEvent) => errorEvent.hasOwnProperty("message"),
  });

  /**
   * !IMPORTANT: We are disabling this as to not override Link click config for the impression pixel.
   * Enabling this for impressions will cause click tracking to break
   */
  if (event !== "impression") {
    window.tracker("enableLinkClickTracking");
  }
};

export default createTracker;
