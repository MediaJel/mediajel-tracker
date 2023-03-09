import getContext from "./shared/utils/get-context";
import { QueryStringContext, SnowplowTrackerInput } from "/src/shared/types";
import createSnowplowTracker from "/src/snowplow";

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    // Load plugin
    if (context.plugin) {
      import("./plugins").then(({ default: load }): void => load(context));
    }

    // Return early if the appId is not specified
    if (context.plugin && !context.appId) return;

    // Validations
    if (!context.appId) throw new Error("appId is required");

    const tracker = createSnowplowTracker();

    const snowplowTrackerInput: SnowplowTrackerInput = {
      appId: context.appId,
      collector: context.collector,
      event: context.event,
    };

    const versionHandlers = {
      "1": () => tracker.legacy(snowplowTrackerInput),
      legacy: () => tracker.legacy(snowplowTrackerInput),
      standard: () => tracker.standard(snowplowTrackerInput),
      "2": () => tracker.standard(snowplowTrackerInput),
      default: () => tracker.standard(snowplowTrackerInput),
    };

    versionHandlers[context.version ?? "default"]();
  } catch (err) {
    const clientError = `An error has occured, please contact your pixel provider: `;
    console.error(clientError + err.message);
  }
})();
