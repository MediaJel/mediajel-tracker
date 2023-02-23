import { QueryStringContext } from "../../types";

export const liquidmSegmentPixel = (context: QueryStringContext) => {
  (function (c, d) {
    var a = document.createElement("script");
    a.type = "text/javascript";
    a.async = !0;
    a.src =
      `https://tracking.lqm.io/odin/handle_sync.js?seg=${context.segmentId}&gdpr=` +
      ("1" === c ? "1" : "0") +
      "&gdpr_consent=" +
      (d ? encodeURIComponent(d) : "") +
      "&cb=" +
      new Date().getTime();
    var b = document.getElementsByTagName("script")[0];
    b.parentNode.insertBefore(a, b);
  })();
};
