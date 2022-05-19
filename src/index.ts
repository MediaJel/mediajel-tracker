
import getContext from "./shared/utils/get-context"
import { QueryStringContext } from "./shared/types";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    switch (context.version) {
      case "1.0.0": {
        const { default: load } = await import("./v1");
        load(context);
      }
      case "2.0.0": {
        const { default: load } = await import("./v2");
        load(context)
      }
    }

  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
