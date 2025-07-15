import logger from 'src/shared/logger';

import { QueryStringContext } from './shared/types';
import getContext from './shared/utils/get-context';
import { getCustomTags } from './shared/utils/get-custom-tags';
import { datasourceLogger } from './shared/utils/datasource-logger';

(async (): Promise<void> => {
  try {
    

    const context: QueryStringContext = getContext();

    await getCustomTags();

    const overrides = window.overrides ? window.overrides : { "s3.pv": "00000", "s3.tr": "00000" }
    
    const modifiedContext = { ...context, ...overrides };

    logger.debug("MJ Tag Context", context);
    logger.debug("Integrations In Progress");

    // Validations
    if (!context.appId) throw new Error("appId is required");
    if (context.debug && context.debug === "true") {
      datasourceLogger();
    }

    await import("src/adapters").then(({ default: load }) => load(modifiedContext));
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
