import { SnowplowTrackerImpressionEvents } from "src/shared/snowplow/types";
import { ImpressionsMacrosParams } from "src/shared/types";

const createSnowplowV2TrackerImpressionEventsHandlers = (): SnowplowTrackerImpressionEvents => {
  return {
    /**
     * ! Note: Please do not change the order of the how the mjcx array is structured.
     * ! Doing so will break the SQL query that displays the Liquid M Macros with
     * ! the link clicks.
     *
     * @param {Partial<LiquidmMacrosParams>} args Required args for Liquid M
     */
    trackLiquidmImpression: ({
      advertiserId,
      advertiserName,
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
      GAID,
      GAID_MD5,
      GAID_SHA1,
      IDFA,
      IDFA_MD5,
      IDFA_SHA1,
      DSPIDENTIFIER,
      DEVICEID,
      MAXMIND_CON_TYPE_NAME,
      MAXMIND_GEO_IDS,
      MAXMIND_ISP_ID,
    }: Partial<ImpressionsMacrosParams>) => {
      const unstruct = {
        schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-3",
        data: {
          advertiserId: advertiserId || "N/A",
          advertiserName: advertiserName || "N/A",
          insertionOrder: insertionOrder || "N/A",
          lineItemId: lineItemId || "LiquidM_MAIN",
          creativeId: creativeId || "N/A",
          publisherId: publisherId || "N/A",
          publisherName: publisherName || "N/A",
          siteId: siteId || "N/A",
          siteName: siteName || "N/A",
          appId: liquidmAppId || "N/A",
          appName: appName || "N/A",
          clickId: clickId || "N/A",
          maxmindConnectionType: MAXMIND_CON_TYPE_NAME || "N/A",
          maxmindGeoIds: MAXMIND_GEO_IDS || "N/A",
          maxmindIspId: MAXMIND_ISP_ID || "N/A",
        },
      };

      const mjcx = [];

      const cCx = {
        schema: "iglu:com.mediajel.contexts/client/jsonschema/1-0-0",
        data: { clientId: "loggedinorg-lanchedby" },
      };

      const cCx2 = {
        schema: "iglu:com.mediajel.contexts/campaign/jsonschema/1-0-0",
        data: { campaignOrderId: "Simplifi_campaign_orders" },
      };

      const cCx3 = {
        schema: "iglu:com.mediajel.contexts/identities/jsonschema/1-0-0",
        data: {
          DSP: "Simplifi",
          GAID: GAID || "N/A",
          GAID_MD5: GAID_MD5 || "N/A",
          GAID_SHA1: GAID_SHA1 || "N/A",
          IDFA: IDFA || "N/A",
          IDFA_MD5: IDFA_MD5 || "N/A",
          IDFA_SHA1: IDFA_SHA1 || "N/A",
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
    },
    trackMantisImpression: ({
      insertionOrder,
      creativeId,
      clickId,
      publisherId,
      lineItemId,
      publisherName,
    }: Partial<ImpressionsMacrosParams>) => {
      const unstruct = {
        schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-3",
        data: {
          insertionOrder: insertionOrder || "N/A",
          lineItemId: lineItemId || "Mantis_Main",
          creativeId: creativeId || "N/A",
          publisherId: publisherId || "N/A",
          publisherName: publisherName || "N/A",
          clickId: clickId || "N/A",
        },
      };

      window.tracker("trackSelfDescribingEvent", unstruct);

      window.tracker("enableLinkClickTracking", null, false, false, [unstruct]); // Do not change the order of the array
    },
    trackSimplifiImpression: ({
      advertiserId,
      advertiserName,
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
      GAID,
      GAID_MD5,
      GAID_SHA1,
      IDFA,
      IDFA_MD5,
      IDFA_SHA1,
      DSPIDENTIFIER,
      DEVICEID,
      MAXMIND_CON_TYPE_NAME,
      MAXMIND_GEO_IDS,
      MAXMIND_ISP_ID,
    }: Partial<ImpressionsMacrosParams>) => {
      const unstruct = {
        schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-3",
        data: {
          advertiserId: advertiserId || "N/A",
          advertiserName: advertiserName || "N/A",
          insertionOrder: insertionOrder || "N/A",
          lineItemId: lineItemId || "Simplifi_MAIN",
          creativeId: creativeId || "N/A",
          publisherId: publisherId || "N/A",
          publisherName: publisherName || "N/A",
          siteId: siteId || "N/A",
          siteName: siteName || "N/A",
          appId: liquidmAppId || "N/A", // change types? make it more general
          appName: appName || "N/A",
          clickId: clickId || "N/A",
          maxmindConnectionType: MAXMIND_CON_TYPE_NAME || "N/A",
          maxmindGeoIds: MAXMIND_GEO_IDS || "N/A",
          maxmindIspId: MAXMIND_ISP_ID || "N/A",
          GAID: GAID || "N/A",
          GAID_MD5: GAID_MD5 || "N/A",
          GAID_SHA1: GAID_SHA1 || "N/A",
          IDFA: IDFA || "N/A",
          IDFA_MD5: IDFA_MD5 || "N/A",
          IDFA_SHA1: IDFA_SHA1 || "N/A",
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
          GAID: GAID || "N/A",
          GAID_MD5: GAID_MD5 || "N/A",
          GAID_SHA1: GAID_SHA1 || "N/A",
          IDFA: IDFA || "N/A",
          IDFA_MD5: IDFA_MD5 || "N/A",
          IDFA_SHA1: IDFA_SHA1 || "N/A",
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
    },
  };
};

export default createSnowplowV2TrackerImpressionEventsHandlers;
