import { QueryStringContext } from "../types";

/**
 * Creates a safe, serializable version of the context object
 * to prevent circular reference issues with Snowplow
 */
export const sanitizeContext = (context: QueryStringContext): QueryStringContext => {
  // Create a shallow copy with only primitive values
  const safeContext: QueryStringContext = {} as QueryStringContext;
  
  // Only include known safe properties
  const safeKeys = [
    'environment',
    'retailId',
    'appId',
    'mediajelAppId',
    'version',
    'event',
    'test',
    'tag',
    'collector',
    'debug',
    'plugin',
    'conversionId',
    'conversionLabel',
    'value',
    'currency',
    'transactionId',
    'crossDomainSites',
    'tagId',
    'advertiserId',
    'advertiserName',
    'insertionOrder',
    'lineItemId',
    'creativeId',
    'publisherId',
    'publisherName',
    'siteId',
    'siteName',
    'liquidmAppId',
    'appName',
    'clickId',
    'GAID',
    'GAID_MD5',
    'GAID_SHA1',
    'IDFA',
    'IDFA_MD5',
    'IDFA_SHA1',
    'DSPIDENTIFIER',
    'DEVICEID',
    'MAXMIND_CON_TYPE_NAME',
    'MAXMIND_GEO_IDS',
    'MAXMIND_ISP_ID',
    's1',
    'segmentId',
    's2',
    's2.pv',
    's2.tr',
    's3.pv',
    's3.tr'
  ];
  
  // Copy only string/number/boolean values
  for (const key of safeKeys) {
    if (context[key] !== undefined && typeof context[key] !== 'object') {
      safeContext[key] = context[key];
    }
  }
  
  return safeContext;
};
