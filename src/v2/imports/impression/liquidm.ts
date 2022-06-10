import { LiquidmMacrosParams } from "../../../shared/types";



/**
 * ! Note: Please do not change the order of the how the mjcx array is structured.
 * ! Doing so will break the SQL query that displays the Liquid M Macros with
 * ! the link clicks.
 * 
 * @param {Partial<LiquidmMacrosParams>} args Required args for Liquid M
 */

const liquidm = ({
  advertiserId,
  insertionOrder,
  lineItemId,
  creativeId,
  publisherId,
  publisherName,
  siteId,
  siteName,
  liquidmAppId,
  appName,
  clickId,
  clickUrl,
  clickPixel,
  clickThrough,
  GAID,
  GAID_MD5,
  GAID_SHA1,
  IDFA,
  IDFA_MD5,
  IDFA_SHA1,
  DSPIDENTIFIER,
  DEVICEID
}: Partial<LiquidmMacrosParams>): void => {
  const liquidmParams = window.mj_liquidm_click_macros || null

  const unstruct = {
    schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-2",
    data: {
      advertiserId: liquidmParams?.customerId || advertiserId || "N/A",
      insertionOrder: liquidmParams?.campaignId || insertionOrder || "N/A",
      lineItemId: lineItemId || "LiquidM_MAIN",
      creativeId: liquidmParams?.adName || creativeId || "N/A",
      publisherId: liquidmParams?.publisherId || publisherId || "N/A",
      publisherName: liquidmParams?.publisherName || publisherName || "N/A",
      siteId: liquidmParams?.appDomain || siteId || "N/A",
      siteName: liquidmParams?.siteName || siteName || "N/A",
      appId: liquidmParams?.appStoreUrl || liquidmAppId || "N/A",
      appName: liquidmParams?.appName || appName || "N/A",
      clickId: liquidmParams?.clickId || clickId || "N/A",
      clickUrl: liquidmParams?.clickUrl || clickUrl || "N/A",
      clickPixel: liquidmParams?.clickPixel || clickPixel || "N/A",
      clickThrough: liquidmParams?.clickThrough || clickThrough || "N/A",
    },
  };


  const mjcx = [];

  const cCx = {
    schema: "iglu:com.mediajel.contexts/client/jsonschema/1-0-0",
    data: { clientId: "loggedinorg-lanchedby" },
  };

  const cCx2 = {
    schema: "iglu:com.mediajel.contexts/campaign/jsonschema/1-0-0",
    data: { campaignOrderId: "LiquidM_campaign_orders" },
  };

  const cCx3 = {
    schema: "iglu:com.mediajel.contexts/identities/jsonschema/1-0-0",
    data: {
      DSP: "LiquidM",
      GAID: liquidmParams?.gaid || GAID || "N/A",
      GAID_MD5: liquidmParams?.gaidMd5 || GAID_MD5 || "N/A",
      GAID_SHA1: liquidmParams?.gaidSha1 || GAID_SHA1 || "N/A",
      IDFA: liquidmParams?.idfa || IDFA || "N/A",
      IDFA_MD5: liquidmParams?.idfaMd5 || IDFA_MD5 || "N/A",
      IDFA_SHA1: liquidmParams?.idfaSha1 || IDFA_SHA1 || "N/A",
      DSPIDENTIFIER: DSPIDENTIFIER || "N/A",
      DEVICEID: DEVICEID || "N/A",
    },
  };

  mjcx.push(cCx);
  mjcx.push(cCx2);
  mjcx.push(cCx3);

  window.tracker("trackSelfDescribingEvent", {
    event: unstruct,
    context: mjcx,
  });

  window.tracker("enableLinkClickTracking", {
    context: [unstruct, ...mjcx], // Do not change the order of the array
  });
};

export default liquidm;
