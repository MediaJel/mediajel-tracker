import logger from "src/shared/logger";
import { createSegments, DstillerySegmentBuilderInput, NexxenSegmentBuilderInput } from "src/shared/segment-builder";
import { SnowplowTracker } from "src/shared/snowplow/types";
import { QueryStringContext } from "src/shared/types";

const setupExtension = (context: QueryStringContext): void => {
  // Fail fast if the required params are not present
  if (!context.conversionId || !context.conversionLabel) {
    console.warn("Conversion ID and Conversion Label are required for Google Ads");
  }

  if (!context.conversionId.includes("AW-")) {
    context.conversionId = `AW-${context.conversionId}`;
  }

  logger.info(`🚀🚀🚀 Google Ads Plugin loaded for ${context.environment}`);

  document.createElement("script").src = `https://www.googletagmanager.com/gtag/js?id=${context.conversionId}`;

  window.dataLayer = window.dataLayer || [];

  function gtag() {
    window.dataLayer.push(arguments);
  }

  window.gtag = gtag;
  /**Note: the @ts-ignore lines below are necessary to supress typescript warnings for the arguments object above */
  // @ts-ignore
  gtag("js", new Date());
  // @ts-ignore
  gtag("config", context.conversionId);

  // Cross domain tracking
  if (context.crossDomainSites) {
    const crossDomainSites = context.crossDomainSites.split(",");
    const sites = crossDomainSites.map((site) => site.trim());
    // @ts-ignore
    gtag("set", "linker", { domains: sites });
  }
};

const withSnowplowGoogleAdsExtension = (snowplow: SnowplowTracker) => {
  const { conversionId, conversionLabel } = snowplow.context;
  setupExtension(snowplow.context);

  // Original trackTransaction method
  const trackTransaction = snowplow.ecommerce.trackTransaction;

  //* Override the trackTransaction method
  snowplow.ecommerce.trackTransaction = (input) => {
    trackTransaction(input);

    logger.info(`🚀🚀🚀 Google Ads Extension Transaction Event`, {
      send_to: `${conversionId}/${conversionLabel}`,
      value: input.total,
      currency: input.currency,
      transaction_id: input.id,
    });

    window.gtag("event", "conversion", {
      send_to: `${conversionId}/${conversionLabel}`,
      value: input.total,
      currency: input.currency,
      transaction_id: input.id,
    });
  };
  return snowplow;
};

export default withSnowplowGoogleAdsExtension;
