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
      if (Array.isArray(window.overrides)) {
        // Find matching override by appId or tag (old array format)
        const matchingOverride = window.overrides.find(override => 
          override.tag === context.appId || override.appId === context.appId
        );
        if (matchingOverride) {
          overrides = matchingOverride;
        }
      } else if (typeof window.overrides === 'object' && window.overrides !== null) {
        // New format: window.overrides is an object with appId properties
        if (context.appId && window.overrides[context.appId]) {
          overrides = window.overrides[context.appId];
        } else {
          // Backwards compatibility for single object override
          overrides = window.overrides;
        }
      }
    } else {
      // Default fallback behavior
      overrides = {
        ...(context["s3.pv"] ? {} : { "s3.pv": "00000" }),
        ...(context["s3.tr"] ? {} : { "s3.tr": "00000" }),
      };
    }

    const modifiedContext = { ...context, ...overrides };

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
