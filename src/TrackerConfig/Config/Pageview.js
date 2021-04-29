//Modular Logic for Pageview
export default function Pageview(aid, col) {
  let mediajelAppId = aid;
  //Pageview SDK
  (function (e, n, o, a, t, c, i) {
    if (!e[t]) {
      e.GlobalSnowplowNamespace = e.GlobalSnowplowNamespace || [];
      e.GlobalSnowplowNamespace.push(t);
      e[t] = function () {
        (e[t].q = e[t].q || []).push(arguments);
      };
      e[t].q = e[t].q || [];
      c = n.createElement(o);
      i = n.getElementsByTagName(o)[0];
      c.async = 1;
      c.src = a;
      i.parentNode.insertBefore(c, i);
    }
  })(
    window,
    document,
    'script',
    'http://drta3gpwmg66h.cloudfront.net/sp.js',
    `mediajelAppId`
  );
  window.mediajelAppId('newTracker', 'cf', `${col}`, {
    appId: `${mediajelAppId}`,
    discoverRootDomain: true,
  });
  window.mediajelAppId('enableActivityTracking', 30, 10);
  window.mediajelAppId('trackPageView');
}
