import { QueryStringContext } from "../../shared/types"
import { debuggerPlugin } from "../snowplow/plugins";

const createTracker = ({ appId, collector, test }: QueryStringContext): void => {
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
        "https://cdn.jsdelivr.net/gh/MediaJel/snowplow-upgrade@master/sp.js",
        "tracker"
    );
    window.tracker("newTracker", "cf", collector, {
        appId,
        discoverRootDomain: true,
        stateStorageStrategy: "cookieAndLocalStorage",
        respectDoNotTrack: true,
        eventMethod: "post",
    });
    window.tracker("enableActivityTracking", {
        minimumVisitLength: 30,
        heartbeatDelay: 10,
    });
    window.tracker("trackPageView");
    window.tracker("enableFormTracking");
    window.tracker("enableLinkClickTracking");
}

export default createTracker