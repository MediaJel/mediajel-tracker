import getTag from "./get-tag";
import applyTag from "./apply-tag";

(async () => {
  try {
    const context = getTag();
    await applyTag(context);
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
