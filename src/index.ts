import getContext from "./shared/utils/get-context";
import { QueryStringContext } from "./shared/types";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    console.log("MJ Tag Context", context)

    // Load plugin
    if (context.plugin) {
      import("./plugins").then(({ default: load }): void => load(context));
    }

    // Return early if the appId is not specified
    if (context.plugin && !context.appId) return;

    // Validations
    if (!context.appId) throw new Error("appId is required");

    const { default: createSnowplowTracker } = await import("/src/snowplow")

    const tracker = await createSnowplowTracker()

    switch (context.version) {
      case "1":
      case "legacy":
        await tracker.legacy(context)
        break;
      case "standard":
      case "2":
        await tracker.standard(context)
        break;
    }
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
