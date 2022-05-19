import applyV1 from "./v1/";
import getContextObject from "./shared/utils"

(async () => {
  try {
    const context = getContextObject();
    if (context.version === "v1") applyV1(context);

  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
