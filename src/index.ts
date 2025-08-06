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

    const overrides = window.overrides
      ? window.overrides
      : {
          ...(context["s3.pv"] ? {} : { "s3.pv": "00000" }),
          ...(context["s3.tr"] ? {} : { "s3.tr": "00000" }),
        };

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
