import getContext from "./shared/utils/get-context";
import { createSnowplowTracker } from "/src/snowplow";
import createLogger from "/src/shared/logger";
import setUseCase from "/src/use-cases";
import { QueryStringContext } from "/src/shared/types";
import { SnowplowTracker, SnowplowTrackerInput } from "/src/snowplow";

const logger = createLogger("main");

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

  const tracker = await createSnowplowTracker({
    appId: context.appId,
    version: context.version,
    collector: context.collector,
    environment: context.environment,
    event: context.event,
  });

  setUseCase({ tracker, ctx: context });
};

main().catch((error) => logger.error("Error in main", error));
