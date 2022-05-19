import applyV1 from "./v1/";
import getContext from "./shared/utils/get-context"
import { QueryStringContext } from "./shared/types";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();
    if (context.version === "v1") applyV1(context);

  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
