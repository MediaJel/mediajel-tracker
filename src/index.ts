import getContext from "./shared/utils/get-context";
import { QueryStringContext } from "./shared/types";
import { datalayerSource } from "./shared/sources/google-datalayer-source";

interface Logger {
  info: (...message: unknown[]) => void;
  warn: (...message: unknown[]) => void;
  error: (...message: unknown[]) => void;
}

const createLogger = (context: QueryStringContext): Logger => {
  const logContext = `[${context.plugin ? context.plugin + " " : ""}${context.appId}]`;

  return {
    info: (...message: unknown[]) => {
      console.log("ℹ️", logContext, ...message);
    },
    warn: (...message: unknown[]) => {
      console.warn("⚠️", logContext, ...message);
    },
    error: (...message: unknown[]) => {
      console.error("❌", logContext, ...message);
    },
  };
};

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    console.log("MJ Tag Context", context);

    console.log("Hello World");
    const dataLogger = createLogger(context);
    dataLogger.info("Received Data: ", context);
    dataLogger.warn("Received Data: ", context);
    dataLogger.error("Received Data: ", context);

    datalayerSource((data) => {
      console.log("Hello World");
      const dataLogger = createLogger(context);

      dataLogger.info("Received Data: ", data);
      dataLogger.warn("Received Data: ", data);
      dataLogger.error("Received Data: ", data);
    });

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
