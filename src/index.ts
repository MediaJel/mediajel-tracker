import logger from "src/shared/logger";

import { QueryStringContext } from "./shared/types";
import getContext from "./shared/utils/get-context";
import { getCustomTags } from "./shared/utils/get-custom-tags";
import { datasourceLogger } from "./shared/utils/datasource-logger";
import { getAppIdTags } from "./shared/utils/get-appId-tags";
import { initializeSessionTracking } from "./shared/utils/session-tracking";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    await getCustomTags();
    await getAppIdTags();

    let overrides = {};

    if (window.overrides) {
      if (typeof window.overrides === 'object' && window.overrides !== null) {
        if (context.appId) {
          // Only use exact matches - disable partial matching entirely
          if (window.overrides[context.appId]) {
            overrides = window.overrides[context.appId];
            logger.debug(`Using exact match overrides for appId: ${context.appId}`);
          } else {
            // If no exact match found, check if there's a default override
            if (window.overrides.default) {
              overrides = window.overrides.default;
              logger.debug(`Using default overrides for appId: ${context.appId}`);
            } else {
              // No matching override found - use empty overrides
              overrides = {};
              logger.debug(`No matching override found for appId: ${context.appId}, using empty overrides`);
            }
          }
        } else {
          // No appId in context - use empty overrides
          overrides = {};
          logger.debug(`No appId in context, using empty overrides`);
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

    if (modifiedContext.enable === "false") {
      logger.debug("Tag has been disabled. Reach out to your pixel provider for more information.");
      return;
    }

  

    logger.debug("MJ Tag Context", modifiedContext);
    logger.debug("Integrations In Progress");

    // Validations
    if (!modifiedContext.appId) throw new Error("appId is required");
    if (modifiedContext.debug && modifiedContext.debug === "true") {
      datasourceLogger();
      initializeSessionTracking(modifiedContext);
    }

    await import("src/adapters").then(({ default: load }) => load(modifiedContext));
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
