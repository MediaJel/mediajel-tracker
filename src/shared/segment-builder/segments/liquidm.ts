import logger from 'src/shared/logger';

const liquidmSegmentBuilder = (segmentId: string) => {
  return {
    emit: () => {
      logger.info("Building s1 segment with segmentId: ", segmentId);
      (function (c, d) {
        var a = document.createElement("script");
        a.type = "text/javascript";
        a.async = !0;
        a.src =
          `https://tracking.lqm.io/odin/handle_sync.js?seg=${segmentId}&gdpr=` +
          ("1" === c ? "1" : "0") +
          "&gdpr_consent=" +
          (d ? encodeURIComponent(d) : "") +
          "&cb=" +
          new Date().getTime();
        var b = document.getElementsByTagName("script")[0];
        b.parentNode.insertBefore(a, b);
      })();
    },
  };
};

export default liquidmSegmentBuilder;
