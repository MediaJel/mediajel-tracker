import logger from "src/shared/logger";
import { ensureGtag } from "src/shared/snowplow/extensions/gtag-loader";
import { SnowplowTracker } from "src/shared/snowplow/types";
import { gpcEnabled } from "src/shared/utils/privacy-signals";

const withAwPrefix = (conversionId: string): string =>
  conversionId.indexOf("AW-") === 0 ? conversionId : `AW-${conversionId}`;

/**
 * This extension will send Google ads conversion events when a transaction is tracked
 */
const withSnowplowGoogleAdsExtension = (snowplow: SnowplowTracker) => {
  const { conversionId: rawConversionId, conversionLabel, crossDomainSites, environment } = snowplow.context;

  // Without both, every conversion would be rejected by Google; leave the tracker as it is rather than throw.
  if (!rawConversionId || !conversionLabel) {
    logger.warn("Conversion ID and Conversion Label are required for Google Ads");
    return snowplow;
  }
  // A visitor's Global Privacy Control opt-out: no Google tag and no Google Ads conversion from us.
  if (gpcEnabled(window.navigator)) {
    logger.debug("Global Privacy Control is on; the Google Ads plugin stays off on this page");
    return snowplow;
  }

  const conversionId = withAwPrefix(String(rawConversionId));
  const linkerDomains = crossDomainSites ? crossDomainSites.split(",").map((site) => site.trim()) : [];
  if (!ensureGtag(window, document, conversionId, linkerDomains)) {
    logger.warn("window.dataLayer is not an array; Google Ads conversions are off on this page");
  }
  logger.info(`🚀🚀🚀 Google Ads Plugin loaded for ${environment}`);

  // Original trackTransaction method
  const trackTransaction = snowplow.ecommerce.trackTransaction;

  //* Override the trackTransaction method
  snowplow.ecommerce.trackTransaction = (input) => {
    trackTransaction(input);

    const conversion = {
      send_to: `${conversionId}/${conversionLabel}`,
      value: input.total,
      currency: input.currency,
      transaction_id: input.id,
    };
    logger.info(`🚀🚀🚀 Google Ads Extension Transaction Event`, conversion);
    if (typeof window.gtag !== "function") return;

    window.gtag("event", "conversion", conversion);
  };
  return snowplow;
};

export default withSnowplowGoogleAdsExtension;
