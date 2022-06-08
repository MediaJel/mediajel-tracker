export const liquidMRetargetingPixel = (c: any = null, d: any = null) => {
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
};
