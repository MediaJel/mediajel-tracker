import getContext from "./shared/utils/get-context";
import { QueryStringContext } from "./shared/types";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    if (context.event === "googleAds") {
      import("./google-ads").then(({ default: load }) => load(context));
      return;
    }

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
