import { QueryStringContext } from "@/shared/types";

const initializeTracker = ({ appId, collector, event }: QueryStringContext): void => {

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
    })(window, document, "script", "//mj-snowplow-static-js.s3.amazonaws.com/cnna.js", "tracker");

    window.tracker("newTracker", "cf", collector, {
        appId,
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

export default initializeTracker;
