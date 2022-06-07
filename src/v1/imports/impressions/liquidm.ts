const liquidm = () => {
  if (window.tracker.impressions.liquidm_click_macros) {
    return;
  }
  const liquidmParams = window.tracker.impressions.liquidm_click_macros;

  const unstruct = {
    schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-2",
    data: {
      advertiserId: liquidmParams.customerId,
      insertionOrder: liquidmParams.campaignId,
      lineItemId: "LiquidM_MAIN",
      creativeId: liquidmParams.adName,
      publisherId: liquidmParams.publisherId,
      publisherName: liquidmParams.publisherName,
      siteId: liquidmParams.appDomain,
      siteName: liquidmParams.siteName,
      appId: liquidmParams.appStoreUrl,
      appName: liquidmParams.appName,
      clickId: liquidmParams.clickId,
      clickUrl: liquidmParams.clickUrl,
      clickPixel: liquidmParams.clickPixel,
      clickThrough: liquidmParams.clickThrough,
    },
  };

  // Do not touch please
  const lqmMacros = {
    schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-2",
    data: {
      advertiserId: "{CUSTOMER_ID}",
      insertionOrder: "{Campaign_ID}",
      lineItemId: "LiquidM_MAIN",
      creativeId: "{AD_NAME}",
      publisherId: "{PUBLISHER_ID}",
      publisherName: "{PUBLISHER_NAME}",
      siteId: "{APP_DOMAIN}",
      siteName: "{SITE_NAME}",
      appId: "{APP_STOREURL}",
      appName: "{APP_NAME}",
      clickId: "{CLICK_ID}",
      clickUrl: "{CLICK_URL}",
      clickPixel: "{CLICK_PIXEL}",
      clickThrough: "{CLICK_THROUGH}",
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
      GAID: liquidmParams.gaid,
      GAID_MD5: liquidmParams.gaidMd5,
      GAID_SHA1: liquidmParams.gaidSha1,
      IDFA: liquidmParams.idfa,
      IDFA_MD5: liquidmParams.idfaMd5,
      IDFA_SHA1: liquidmParams.idfaSha1,
      DSPIDENTIFIER: "",
      DEVICEID: "",
    },
  };

  mjcx.push(cCx);
  mjcx.push(cCx2);
  mjcx.push(cCx3);
  window.tracker("trackSelfDescribingEvent", unstruct, mjcx);

  window.tracker("enableLinkClickTracking", null, false, false, [lqmMacros]); // <--- Do not touch this
};

export default liquidm;
