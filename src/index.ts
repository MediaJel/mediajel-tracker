import getContext from "./shared/utils/get-context";
import { QueryStringContext } from "./shared/types";

(async (): Promise<void> => {
  try {
    document.addEventListener("DOMContentLoaded", () => {
      const context = getContext();

      context.forEach((ctxt: QueryStringContext)  => {
        console.log("MJ Tag Context", ctxt);

        // Load plugin
        if (ctxt.plugin) {
          import("./plugins").then(({ default: load }): void => load(ctxt));
        }

        // Return early if the appId is not specified
        if (ctxt.plugin && !ctxt.appId) return;

        // Validations
        if (!ctxt.appId) throw new Error("appId is required");

        switch (ctxt.version) {
          case "1":
            import("./v1").then(({ default: load }) => load(ctxt));
            break;
          case "2":
            import("./v2").then(({ default: load }) => load(ctxt));
            break;
        }
      });
    });
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
