import applyTag from "./apply-tag/applyTag";
import getContextObject from "./apply-tag/getContextObject";

(async () => {
  try {
    const context = getContextObject();
    await applyTag(context);
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
