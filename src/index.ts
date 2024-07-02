import getContext from "./shared/utils/get-context";
import { QueryStringContext } from "./shared/types";
import { getCustomTags } from "./shared/utils/get-custom-tags";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    const betaDomains = ["seedoflifelabs.com"];

    if (betaDomains.includes(window.location.hostname)) {
      console.log("Loading custom tag for: ", window.location.hostname);
      getCustomTags();
    }

    console.log("MJ Tag Context", context);

    // Load plugin
    if (context.plugin) {
      import("./plugins").then(({ default: load }): void => load(context));
    }

    // Return early if the appId is not specified
    if (context.plugin && !context.appId) return;

    // Validations
    if (!context.appId) throw new Error("appId is required");

    switch (context.version) {
      case "1":
        import("./v1").then(({ default: load }) => load(context));
        break;
      case "2":
        import("./v2").then(({ default: load }) => load(context));
        break;
    }
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
