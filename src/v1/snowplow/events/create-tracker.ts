import { QueryStringContext } from "../../../shared/types";

const createTracker = async ({ appId, collector, event }: QueryStringContext) => {
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
  })(window, document, "script", "//azsx401.dmp.cnna.io/sprite.js", "tracker");

  // make a GET request to equative to get the user id
  try {
    const response = await fetch(
      `https://sync.smartadserver.com/getuid?url=https%3A%2F%2F7a97-143-44-192-184.ngrok-free.app%2Fusersync%3Fuid%3D%5Bsas_uid%5D`,
      {
        method: "GET",
        redirect: "follow",
        headers: {
          accept: 'application/json',
        },
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log(data);

      // Create a context entity and add it to global context
      let contextEntity = {
        schema: "iglu:com.acme/user_context/jsonschema/1-0-0",
        data,
      };
      console.log(contextEntity);
      window.snowplow("addGlobalContexts", [contextEntity]);
    } else {
      console.error("Request failed with status:", response.status);
    }
  } catch (error) {
    console.error("Error:", error);
  }


  // Creates the tracker with the appId and sends events to collector url
  window.tracker("newTracker", "cnna", `${collector}`, {
    appId: appId,
    postPath: "/analytics/track",
    discoverRootDomain: true,
    stateStorageStrategy: "cookieAndLocalStorage",
    cookieSameSite: "Lax",
    respectDoNotTrack: false,
    eventMethod: "post",
  });

  window.tracker("enableActivityTracking", 30, 10);
  window.tracker("trackPageView");
  window.tracker("enableFormTracking");

  /**
   * !IMPORTANT: We are disabling this as to not override Link click config for the impression pixel.
   * Enabling this for impressions will cause click tracking to break
   */
  if (event !== "impression") {
    window.tracker("enableLinkClickTracking");
  }
};

export default createTracker;
