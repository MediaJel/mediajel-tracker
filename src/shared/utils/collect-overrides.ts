import { QueryStringContext } from "../types";

/**
 * Collects override configurations from multiple window objects
 * Supports both the legacy window.overrides and new dynamic override objects
 * 
 * @returns Combined override configuration from all sources
 */
export const collectOverrides = (): Partial<QueryStringContext> => {
  const overrides: Partial<QueryStringContext> = {};
  
  // Legacy support for window.overrides
  if (window.overrides && typeof window.overrides === 'object') {
    Object.assign(overrides, window.overrides);
  }
  
  // Get current appId from context to check for appId-specific overrides
  const currentAppId = getCurrentAppId();
  if (currentAppId) {
    // Check for exact appId match override
    if ((window as any)[currentAppId] && typeof (window as any)[currentAppId] === 'object') {
      console.debug(`Found appId-specific override: ${currentAppId}`, (window as any)[currentAppId]);
      Object.assign(overrides, (window as any)[currentAppId]);
    }
    
    // Check for appId-suffixed override objects
    const windowKeys = Object.keys(window);
    for (const key of windowKeys) {
      if (key.startsWith(currentAppId) && key !== currentAppId) {
        try {
          const value = (window as any)[key];
          if (isValidOverrideObject(value)) {
            console.debug(`Found appId-suffixed override: ${key}`, value);
            Object.assign(overrides, value);
          }
        } catch (error) {
          continue;
        }
      }
    }
  }
  
  // Collect overrides from window objects that match general override patterns
  const windowKeys = Object.keys(window);
  
  for (const key of windowKeys) {
    // Skip appId-specific keys as they're handled above
    if (currentAppId && key.startsWith(currentAppId)) continue;
    
    // Skip known non-override properties and functions
    if (shouldSkipKey(key)) continue;
    
    try {
      const value = (window as any)[key];
      
      // Check if this looks like an override object
      if (isValidOverrideObject(value)) {
        console.debug(`Found override object: ${key}`, value);
        Object.assign(overrides, value);
      }
    } catch (error) {
      // Skip properties that can't be accessed
      continue;
    }
  }
  
  return overrides;
};

/**
 * Gets the current appId from the context without causing circular dependencies
 */
const getCurrentAppId = (): string | null => {
  try {
    const scripts: HTMLCollectionOf<HTMLScriptElement> = document.getElementsByTagName("script");
    const target: HTMLScriptElement = (document.currentScript as HTMLScriptElement) || scripts[scripts.length - 1];
    
    // Check if we have a query string
    const src = target.src;
    const questionMarkIndex = src.indexOf("?");
    if (questionMarkIndex === -1) return null;
    
    const substring: string = src.substring(questionMarkIndex);
    const urlSearchParams: URLSearchParams = new URLSearchParams(substring);
    
    return urlSearchParams.get('appId') || urlSearchParams.get('mediajelAppId');
  } catch (error) {
    return null;
  }
};

/**
 * Determines if a window key should be skipped when collecting overrides
 */
const shouldSkipKey = (key: string): boolean => {
  const skipPatterns = [
    // Built-in window properties
    'window', 'document', 'location', 'navigator', 'screen', 'history',
    'localStorage', 'sessionStorage', 'console', 'alert', 'confirm', 'prompt',
    'setTimeout', 'setInterval', 'clearTimeout', 'clearInterval',
    'requestAnimationFrame', 'cancelAnimationFrame',
    'addEventListener', 'removeEventListener', 'dispatchEvent',
    
    // Known MediaJel properties
    'trackTrans', 'trackSignUp', 'addToCart', 'removeFromCart',
    'registerThirdPartyTags', 'overrides', 'cnnaSegments', 'wixDevelopersAnalytics',
    'GlobalSnowplowNamespace', 'src', 'snowplow', 'tracker', 'mj_liquidm_click_macros',
    'Shopify', 'lightspeedTransaction', 'transactionOrder', 'transactionItems',
    'transactionEmail', 'dataLayer', 'gtag', 'uetq', 'gtmDataLayer',
    
    // Common third-party properties
    'jQuery', '$', '_', 'ga', 'gtag', 'fbq', 'dataLayer', 'google_tag_manager',
    'optimizely', 'adobe', 's', 's_gi', 's_objectID', 'utag', 'tealium'
  ];
  
  return skipPatterns.includes(key) || 
         key.startsWith('on') || // Event handlers
         /^[A-Z_]+$/.test(key) || // Constants
         typeof (window as any)[key] === 'function'; // Functions
};

/**
 * Validates if an object looks like a valid override configuration
 */
const isValidOverrideObject = (obj: any): boolean => {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return false;
  }
  
  // Check if object has any properties that look like QueryStringContext keys
  const validKeys = [
    'environment', 'retailId', 'appId', 'mediajelAppId', 'version', 'event',
    'test', 'tag', 'collector', 'debug', 'plugin', 'conversionId', 'conversionLabel',
    'value', 'currency', 'transactionId', 'crossDomainSites', 'tagId', 'advertiserId',
    'advertiserName', 'insertionOrder', 'lineItemId', 'creativeId', 'publisherId',
    'publisherName', 'siteId', 'siteName', 'liquidmAppId', 'appName', 'clickId',
    'GAID', 'GAID_MD5', 'GAID_SHA1', 'IDFA', 'IDFA_MD5', 'IDFA_SHA1', 'DSPIDENTIFIER',
    'DEVICEID', 'MAXMIND_CON_TYPE_NAME', 'MAXMIND_GEO_IDS', 'MAXMIND_ISP_ID',
    's1', 'segmentId', 's2', 's2.pv', 's2.tr', 's3.pv', 's3.tr'
  ];
  
  const objKeys = Object.keys(obj);
  return objKeys.some(key => validKeys.includes(key));
};
