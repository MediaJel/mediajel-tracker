export default function liquidm() {

  const unstruct = {
    schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-1",
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
    },
  };

  const mjcx = []

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
      GAID: "{GAID}",
      GAID_MD5: "{GAID_MD5 }",
      GAID_SHA1: "{GAID_SHA1}",
      IDFA: "{IDFA}",
      IDFA_MD5: "{IDFA_MD5}",
      IDFA_SHA1: "{IDFA_SHA1}",
      DSPIDENTIFIER: "",
      DEVICEID: "",
    },
  };

  mjcx.push(cCx),
  mjcx.push(cCx2),
  mjcx.push(cCx3),

  window.tracker("trackSelfDescribingEvent", unstruct, mjcx)
}