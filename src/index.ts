import loadAdapters from "src/adapters";
import logger from "src/shared/logger";

import { QueryStringContext } from "./shared/types";
import getContext from "./shared/utils/get-context";
import { getCustomTags } from "./shared/utils/get-custom-tags";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    logger.debug("MJ Tag Context", context);

    // Validations
    if (!context.appId) throw new Error("appId is required");

    getCustomTags();

    await loadAdapters(context);

    // switch (context.version) {
    //   case "1":
    //     import("./v1").then(({ default: load }) => load(context));
    //     break;
    //   case "2":
    //     import("./v2").then(({ default: load }) => load(context));
    //     break;
    // }
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
