import getTag from "./get-tag/getContext";
import applyTag from "./apply-tag/applyTag";

(async () => {
  try {
    const context = getTag();
    await applyTag(context);
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
