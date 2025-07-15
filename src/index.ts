import logger from 'src/shared/logger';

import { QueryStringContext } from './shared/types';
import getContext from './shared/utils/get-context';
import { getCustomTags } from './shared/utils/get-custom-tags';
import { datasourceLogger } from './shared/utils/datasource-logger';

(async (): Promise<void> => {
  try {
    await getCustomTags();
    
    const context: QueryStringContext = getContext();

    logger.debug("MJ Tag Context", context);
    logger.debug("Integrations In Progress");

    // Validations
    if (!context.appId) throw new Error("appId is required");
    if (context.debug && context.debug === "true") {
      datasourceLogger();
    }

    await import("src/adapters").then(({ default: load }) => load(context));
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
