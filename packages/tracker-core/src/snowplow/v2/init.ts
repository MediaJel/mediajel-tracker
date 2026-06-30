import { isNonSensitiveFormField } from "@mediajel/tracker-core/snowplow/form-pii-filter";
import logger from "@mediajel/tracker-core/logger";
import { SnowplowTrackerInitializeInput } from "@mediajel/tracker-core/snowplow/types";

export const initialize = ({ appId, collector, event, sdkUrl }: SnowplowTrackerInitializeInput) => {
  logger.debug(`SDK URL: ${sdkUrl}`);
  (function (e, o, n, t, a, c?: any, i?: any) {
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
  window.tracker("newTracker", appId, collector, {
    appId,
    postPath: "/analytics/track",
    discoverRootDomain: true,
    stateStorageStrategy: "cookieAndLocalStorage",
    cookieSameSite: "Lax",
    // Privacy-compliant posture: first-party Secure cookies, and honor Do Not Track at the SDK
    // level too. The tag's edge gate (isUsPrivacyOptOut) already hard-exits on GPC/DNT before the
    // tracker loads; respectDoNotTrack is a second, SDK-level guard so DNT is still honored on any
    // path that reaches the Snowplow tracker.
    cookieSecure: true,
    respectDoNotTrack: true,
    eventMethod: "post",
  });
  // Second tracker for new pipeline collector
  window.tracker("newTracker", `${appId}_v2`, "collector-latest.dmp.cnna.io", {
    appId,
    postPath: "/analytics/track",
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
  // Exclude PII/sensitive fields (email, password, phone, payment…) from form capture (v3 form plugin).
  window.tracker("enableFormTracking", { options: { fields: { filter: isNonSensitiveFormField } } });
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
