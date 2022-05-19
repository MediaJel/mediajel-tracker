import { QueryStringContext, Transactions } from "../../shared/types";
import pageview from "./pageview";
import recordIntegration from "./record-integration";

const loadTracker = (context: QueryStringContext): void => {
  const { appId, collector } = context;

  if (!window.tracker) {
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
      eventMethod: "post",
    });
  }

  // General events that we want to include in tracking after loading sp.js file
  pageview(context as Transactions);
  recordIntegration(context as Transactions);
  window.tracker("enableFormTracking");
  window.tracker("enableLinkClickTracking");

};

export default loadTracker;
