import { QueryStringContext } from "../../../shared/types";

// const createTracker = ({ appId, collector, event }: QueryStringContext): void => {
//   // Loading tracker with the snowplow tag by fetching our sp.js file
//   // Creates a global function called "tracker" which we use to access the Snowplow Tracker
//   (function (e, o, n, t, a, c, i) {
//     if (!e[a]) {
//       e.GlobalSnowplowNamespace = e.GlobalSnowplowNamespace || [];
//       e.GlobalSnowplowNamespace.push(a);
//       e[a] = function () {
//         (e[a].q = e[a].q || []).push(arguments);
//       };
//       e[a].q = e[a].q || [];
//       c = o.createElement(n);
//       i = o.getElementsByTagName(n)[0];
//       c.async = 1;
//       c.src = t;
//       i.parentNode.insertBefore(c, i);
//     }
//   })(window, document, "script", "//dm2q9qfzyjfox.cloudfront.net/sp.js", "tracker");

//   // Creates the tracker with the appId and sends events to collector url
//   window.tracker("newTracker", appId, `${collector}`, {
//     appId: appId,
//     postPath: "/analytics/track",
//     discoverRootDomain: true,
//     stateStorageStrategy: "cookieAndLocalStorage",
//     cookieSameSite: "Lax",
//     respectDoNotTrack: false,
//     eventMethod: "post",
//   });

//   window.tracker("enableActivityTracking", 30, 10);
//   window.tracker("trackPageView");
//   window.tracker("enableFormTracking");

//   /**
//    * !IMPORTANT: We are disabling this as to not override Link click config for the impression pixel.
//    * Enabling this for impressions will cause click tracking to break
//    */
//   if (event !== "impression") {
//     window.tracker("enableLinkClickTracking");
//   }
// };

const createTracker = ({ appId, collector, event }: QueryStringContext): void => {
  // Loading tracker with the snowplow tag by fetching our sp.js file
  // Creates a global function called "tracker" which we use to access the Snowplow Tracker
  // (function (e, o, n, t, a, c, i) {
  //   if (!e[a]) {
  //     e.GlobalSnowplowNamespace = e.GlobalSnowplowNamespace || [];
  //     e.GlobalSnowplowNamespace.push(a);
  //     e[a] = function () {
  //       (e[a].q = e[a].q || []).push(arguments);
  //     };
  //     e[a].q = e[a].q || [];
  //     c = o.createElement(n);
  //     i = o.getElementsByTagName(n)[0];
  //     c.async = 1;
  //     c.src = t;
  //     i.parentNode.insertBefore(c, i);
  //   }
  // })(window, document, "script", "//dm2q9qfzyjfox.cloudfront.net/sp.js", "trackerStaging");

  (function (p, l, o, w, i, n, g) {
    if (!p[i]) {
      p.GlobalSnowplowNamespace = p.GlobalSnowplowNamespace || [];
      p.GlobalSnowplowNamespace.push(i);
      p[i] = function () {
        (p[i].q = p[i].q || []).push(arguments);
      };
      p[i].q = p[i].q || [];
      n = l.createElement(o);
      g = l.getElementsByTagName(o)[0];
      n.async = 1;
      n.src = w;
      g.parentNode.insertBefore(n, g);
    }
  })(window, document, "script", "//mj-snowplow-static-js.s3.amazonaws.com/sp.js", "trackerStaging");

  // Creates the tracker with the appId and sends events to collector url
  window.trackerStaging("newTracker", appId, `${collector}`, {
    appId: appId,
    postPath: "/analytics/track",
    discoverRootDomain: true,
    stateStorageStrategy: "cookieAndLocalStorage",
    cookieSameSite: "Lax",
    respectDoNotTrack: false,
    eventMethod: "post",
  });

  window.trackerStaging("enableActivityTracking", 30, 10);
  window.trackerStaging("trackPageView");
  window.trackerStaging("enableFormTracking");

  /**
   * !IMPORTANT: We are disabling this as to not override Link click config for the impression pixel.
   * Enabling this for impressions will cause click tracking to break
   */
  if (event !== "impression") {
    window.trackerStaging("enableLinkClickTracking");
  }
};

export default createTracker;
