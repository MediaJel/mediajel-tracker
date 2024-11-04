import logger from "src/shared/logger";
import { createSegments, DstillerySegmentBuilderInput, NexxenSegmentBuilderInput } from "src/shared/segment-builder";
import { SnowplowTracker } from "src/shared/snowplow/types";
import { QueryStringContext } from "src/shared/types";

const setupExtension = (context: QueryStringContext): void => {
  const script = document.createElement("script");
  script.type = "text/javascript";
  script.innerHTML = `(function(w,d,t,r,u){var f,n,i;w[u]=w[u]||[],f=function(){var o={ti:${context.tagId}};o.q=w[u],w[u]=new UET(o),w[u].push("pageLoad")},n=d.createElement(t),n.src=r,n.async=1,n.onload=n.onreadystatechange=function(){var s=this.readyState;s&&s!=="loaded"&&s!=="complete"||(f(),n.onload=n.onreadystatechange=null)},i=d.getElementsByTagName(t)[0],i.parentNode.insertBefore(n,i)})(window,document,"script","//bat.bing.com/bat.js","uetq");`;
  document.head.appendChild(script);

  window.uetq = window.uetq || [];
};

const withSnowplowBingAdsExtension = (snowplow: SnowplowTracker) => {
  const { conversionId, conversionLabel } = snowplow.context;
  setupExtension(snowplow.context);

  // Original trackTransaction method
  const trackTransaction = snowplow.ecommerce.trackTransaction;

  //* Override the trackTransaction method
  snowplow.ecommerce.trackTransaction = (input) => {
    trackTransaction(input);
    logger.info(`🚀🚀🚀 Bing Ads Plugin Transaction Event`);

    window.uetq.push("event", "purchase", {
      transaction_id: input.id,
      ecomm_prodid: input.items.map((item) => item.sku),
      ecomm_pagetype: "purchase",
      ecomm_totalvalue: input.total,
      revenue_value: input.total,
      currency: "USD",
      items: input.items.map((item) => ({
        id: item.sku,
        quantity: item.quantity,
        price: item.unitPrice,
      })),
    });
  };
  return snowplow;
};

export default withSnowplowBingAdsExtension;
