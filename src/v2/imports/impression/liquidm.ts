const liquidm = (): void => {
  const liquidmParams = window.mj_liquidm_click_macros || null

  const unstruct = {
    schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-2",
    data: {
      advertiserId: liquidmParams?.customerId || "N/A",
      insertionOrder: liquidmParams?.campaignId || "N/A",
      lineItemId: "LiquidM_MAIN",
      creativeId: liquidmParams?.adName || "N/A",
      publisherId: liquidmParams?.publisherId || "N/A",
      publisherName: liquidmParams?.publisherName || "N/A",
      siteId: liquidmParams?.appDomain || "N/A",
      siteName: liquidmParams?.siteName || "N/A",
      appId: liquidmParams?.appStoreUrl || "N/A",
      appName: liquidmParams?.appName || "N/A",
      clickId: liquidmParams?.clickId || "N/A",
      clickUrl: liquidmParams?.clickUrl || "N/A",
      clickPixel: liquidmParams?.clickPixel || "N/A",
      clickThrough: liquidmParams?.clickThrough || "N/A",
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
      GAID: liquidmParams?.gaid || "N/A",
      GAID_MD5: liquidmParams?.gaidMd5 || "N/A",
      GAID_SHA1: liquidmParams?.gaidSha1 || "N/A",
      IDFA: liquidmParams?.idfa || "N/A",
      IDFA_MD5: liquidmParams?.idfaMd5 || "N/A",
      IDFA_SHA1: liquidmParams?.idfaSha1 || "N/A",
      DSPIDENTIFIER: "",
      DEVICEID: "",
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
    context: mjcx,
  });
};

export default liquidm;
