import applyTag from "./apply-tag/applyTag";
import getContextObject from "./apply-tag/getContextObject";

(async () => {
  try {
    const scripts = document.getElementsByTagName('script');
    const index = scripts.length - 1;
    const myScript = scripts[index];
    const context = getContextObject(myScript);
    console.log(context);
    await applyTag(context);
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
