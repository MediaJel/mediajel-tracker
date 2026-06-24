import logger, { isLoggingEnabled, setLoggingEnabled } from '@mediajel/tracker-core/logger';

import { QueryStringContext } from '@mediajel/tracker-core/types';
import { getAppIdTags } from '@mediajel/tracker-core/utils/get-appId-tags';
import getContext from '@mediajel/tracker-core/utils/get-context';
import { getCustomTags } from '@mediajel/tracker-core/utils/get-custom-tags';
import isUsPrivacyOptOut from '@mediajel/tracker-core/utils/privacy-opt-out';
import { createRetailId } from '@mediajel/tracker-core/utils/retail-id-parser';

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    // US privacy opt-out gate — honor GPC / DNT before any tracking or network activity.
    // (getContext() above only parses the script URL — no network/cookies — so it's safe first.)
    // Lives in the tag so every embedding site inherits it. Hard no-track: we return before
    // loading adapters, Snowplow, custom tags, or appId tags — no events, no cookies.
    if (isUsPrivacyOptOut()) {
      logger.debug("US privacy opt-out detected (GPC/DNT). Tracker will not initialize.");
      return;
    }

    await getCustomTags();
    await getAppIdTags(context.appId);

    let overrides = {};

    if (window.overrides) {
      if (Array.isArray(window.overrides)) {
        // Find matching override by appId or tag (old array format)
        const matchingOverride = window.overrides.find(
          (override) => override.tag === context.appId || override.appId === context.appId,
        );
        logger.debug(`Using default overrides for appId: ${context.appId}`);
        if (matchingOverride) {
          overrides = matchingOverride;
        }
      } else if (typeof window.overrides === "object" && window.overrides !== null) {
        // New format: window.overrides is an object with appId properties
        if (context.appId && window.overrides[context.appId]) {
          overrides = window.overrides[context.appId];
          logger.debug(`Using New Array overrides for appId: ${context.appId}`);
        } else {
          // Backwards compatibility for single object override
          overrides = window.overrides;
          logger.debug(`Using default single overrides for appId: ${context.appId}`);
        }
      }
    } else {
      // Default fallback behavior
      overrides = {
        ...(context["s3.pv"] ? {} : { "s3.pv": "00000" }),
        ...(context["s3.tr"] ? {} : { "s3.tr": "00000" }),
      };
      logger.debug(`Using default fallback overrides for appId: ${context.appId}`);
    }

    const modifiedContext = { ...context, ...overrides };

    // Re-apply the logging flag now that window.overrides are merged, so logs can be
    // toggled per-appId via overrides too. The query-string value is already live from
    // logger module-init (earliest point); this only changes things when an override
    // sets `logs`. Opt-out default: logging stays on unless explicitly "false".
    setLoggingEnabled(modifiedContext.logs !== "false");

    if (modifiedContext.enable === "false") {
      logger.debug("Tag has been disabled. Reach out to your pixel provider for more information.");
      return;
    }

    logger.debug("MJ Tag Context", modifiedContext);
    logger.debug("Integrations In Progress");

    // Validations
    if (!modifiedContext.appId) throw new Error("appId is required");
    if (modifiedContext.debug && modifiedContext.debug === "true" && isLoggingEnabled()) {
      // Debug-only datasource logging is dynamically imported so it splits into its own chunk
      // and stays out of the always-loaded index.js.
      const { datasourceLogger } = await import("@mediajel/tracker-core/utils/datasource-logger");
      datasourceLogger();
    }

    window.parseRetailId = createRetailId;

    await import("src/adapters").then(({ default: load }) => load(modifiedContext));
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + (err instanceof Error ? err.message : String(err)));
  }
})();
