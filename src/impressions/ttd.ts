export const ttd = () => {
  const unstruct = {
    schema: "iglu:com.mediajel.events/ad_impression/jsonschema/1-0-1",
    data: {
        advertiserId: "%%TTD_ADVERTISERID%%",
        insertionOrder: "%%TTD_CAMPAIGNID%%",
        lineItemId: "%%TTD_ADGROUPID%%",
        creativeId: "%%TTD_CREATIVEID%%",
        publisherId: "%%TTD_PUBLISHERID%%",
        publisherName: "N/A"
    }
  };
  const mjcx = [];
  const cCx = {
      schema: "iglu:com.mediajel.contexts/client/jsonschema/1-0-0",
      data: {
          clientId: "loggedinorg-lanchedby"
      }
  };
  const cCx2 = {
      schema: "iglu:com.mediajel.contexts/campaign/jsonschema/1-0-0",
      data: {
          campaignOrderId: "TTD_campaign_orders"
      }
  };
  const cCx3 = {
      schema: "iglu:com.mediajel.contexts/identities/jsonschema/1-0-0",
      data: {
          DSP: "TTD",
          GAID: "%%TTD_DEVICEID%%",
          GAID_MD5: "N/A",
          GAID_SHA1: "N/A",
          IDFA: "%%TTD_DEVICEID%%",
          IDFA_MD5: "N/A",
          IDFA_SHA1: "N/A",
          DSPIDENTIFIER: "%%TTD_TDID%%",
          DEVICEID: ""
      }
  };
  mjcx.push(cCx);
  mjcx.push(cCx2);
  mjcx.push(cCx3);
  window.tracker("trackSelfDescribingEvent", unstruct, mjcx);
}

export default ttd;