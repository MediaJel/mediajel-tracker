import getContext from "./shared/utils/get-context";
import createSnowplowTracker from "/src/snowplow";
import createLogger from "/src/shared/logger";
import { QueryStringContext, SnowplowTracker, SnowplowTrackerInput } from "/src/shared/types";

const logger = createLogger("main");

const selectTrackerVersion = (input: SnowplowTrackerInput): Promise<SnowplowTracker> => {
  const tracker = createSnowplowTracker(input);
  switch (input.version) {
    case "1":
    case "legacy":
      return tracker.legacy();
    case "2":
    case "standard":
      return tracker.standard();
    default:
      return tracker.legacy();
  }
};

const main = async (): Promise<void> => {
  const context: QueryStringContext = getContext();
  logger.info("Query string parameters for the tag: ", context);

  // Load plugin
  if (context.plugin) {
    import("./plugins").then(({ default: load }): void => load(context));
  }

  // Return early if the appId is not specified
  if (context.plugin && !context.appId) {
    logger.error(`parameter "appId" is required, tracker not created`);
    return;
  }

  // Validations
  if (!context.appId) {
    logger.error(`parameter "appId" is required, tracker not created`);
    return;
  }

  const tracker = await selectTrackerVersion({
    appId: context.appId,
    version: context.version,
    collector: context.collector,
    environment: context.environment,
    event: context.event,
  });

  
};

main().catch((error) => logger.error("Error in main", error));
