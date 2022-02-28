var querystring = (document.currentScript).src.substring( (document.currentScript).src.indexOf("?") );
var urlParams = new URLSearchParams( querystring );

const queryStringResult = Object.fromEntries(urlParams.entries()); // Array [ "bar", "bar2" ]
// const proxyUrlParams = new Proxy (new URLSearchParams(querystring), {
//   get: (searchParams, prop) => searchParams.get(prop),
// })
console.log(queryStringResult);
// console.log(proxyUrlParams);

// const object = Object.assign({}, proxyUrlParams);
// console.log(object.appId);

const contextObject = {...queryStringResult,
  appId: queryStringResult.appId ?? queryStringResult.mediajelAppId,
  version: queryStringResult.version ?? "latest",
  collector: queryStringResult.test
    ? true
    : false,
  event: queryStringResult.event ?? "transaction",
  };

delete contextObject.mediajelAppId && delete contextObject.test;

// type QueryStringParams = {
//   appId ?: String;
//   retailId ?: String;
//   environment ?: String;
//   test ?: String;
//   event ?: String;
//   emailAddress ?: String;
// }

// const proxyContextObject = {
//   appId: (proxyUrlParams).appId,
//   retailId: (proxyUrlParams).retailId,
//   environment: (proxyUrlParams).environment,
//   collector: (proxyUrlParams).test ? true : false,
//   event: (proxyUrlParams).event,
//   emailAddress: (proxyUrlParams).emailAddress,
// }

console.log(contextObject);
// console.log(proxyContextObject);

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
  "https://dm2q9qfzyjfox.cloudfront.net/sp.js",
  "tracker"
);

window.tracker("newTracker", "cf", `//collector.dmp.mediajel.ninja`, {
  appId: contextObject.appId,
  discoverRootDomain: true,
  stateStorageStrategy: "cookieAndLocalStorage",
  cookieSameSite: "Lax",
  respectDoNotTrack: true,
});

const pageview = event => {
  if(event === 'transaction') {
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
  }
  return;
}

pageview(contextObject.event);
