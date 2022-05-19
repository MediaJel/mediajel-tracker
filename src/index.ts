
import getContext from "./shared/utils/get-context"
import { QueryStringContext } from "./shared/types";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    switch (context.version) {
      case "v1": {
        const { default: call } = await import("./v1");
        call(context);
      }
    }

  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
