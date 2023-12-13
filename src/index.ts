import getContext from "./shared/utils/get-context";
import { QueryStringContext } from "./shared/types";
import { datalayerSource } from "./shared/sources/google-datalayer-source";
import { xhrRequestSource } from "./shared/sources/xhr-request-source";
import { xhrResponseSource } from "./shared/sources/xhr-response-source";
import { postMessageSource } from "./shared/sources/post-message-source";

export interface CreateLoggerOptionsInput {
  label?: string;
  level?: string;
}

interface Logger {
  debug: (...message: unknown[]) => void;
  info: (...message: unknown[]) => void;
  warn: (...message: unknown[]) => void;
  error: (...message: unknown[]) => void;
}

const parseMsgToString = (message: unknown | unknown[]): string => {
  if (typeof message === "string" || typeof message === "number") {
    return message.toString();
  } else if (Array.isArray(message)) {
    return message.map(parseMsgToString).join(" ");
  } else {
    return JSON.stringify(message, null, 2);
  }
};

const createLogger = (name: String, label: String): Logger => {
  const logContext = `[${name}${label ? " " + label : ""}]`;

  return {
    debug: (...message: unknown[]) => {
      console.log("🔧", logContext, ...message.map(parseMsgToString));
    },
    info: (...message: unknown[]) => {
      console.log("ℹ️", logContext, ...message.map(parseMsgToString));
    },
    warn: (...message: unknown[]) => {
      console.warn("⚠️", logContext, ...message.map(parseMsgToString));
    },
    error: (...message: unknown[]) => {
      console.error("❌", logContext, ...message.map(parseMsgToString));
    },
  };
};

(async (): Promise<void> => {
  try {
    const context: QueryStringContext = getContext();

    console.log("MJ Tag Context", context);

    const test = createLogger("TEST1", context.appId);
    test.info(context);

    datalayerSource((data) => {
      const dataSourceLogger = createLogger(context.appId, "Data Layer Source");

      dataSourceLogger.info(data);
    });

    xhrRequestSource((data) => {
      const xhrSourceLogger = createLogger(context.appId, "XHR Layer Source");
      xhrSourceLogger.info(data);
    });

    xhrResponseSource((data) => {
      const xhrResponseSource = createLogger(context.appId, "XHR Response Source");
      xhrResponseSource.info(data);
    });

    postMessageSource((data) => {
      const postMessageSource = createLogger(context.appId, "Post Message Source");
      postMessageSource.info(data);
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
