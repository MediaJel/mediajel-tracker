export interface CreateLoggerOptionsInput {
  level?: string;
}

export interface Logger {
  setLabel: (label: string) => void;
  debug: (...message: unknown[]) => void;
  info: (...message: unknown[]) => void;
  warn: (...message: unknown[]) => void;
  error: (...message: unknown[]) => void;
}

const colors = {
  debug: "color: White; background: #CB7A01; font-weight: bold; padding: 1px 4px; border-radius: 3px;",
  info: "color: White; background: #388AB8; font-weight: bold; padding: 1px 4px; border-radius: 3px;",
  warn: "color: White; background: #F26430; font-weight: bold; padding: 1px 4px; border-radius: 3px;",
  error: "color: White; background: #AD343E; font-weight: bold; padding: 1px 4px; border-radius: 3px;",
};

const parseMsgToString = (message: unknown | unknown[]): string => {
  if (typeof message === "string" || typeof message === "number") {
    return message.toString();
  } else if (Array.isArray(message)) {
    return message.map(parseMsgToString).join(" ");
  } else {
    return JSON.stringify(message, null, 2);
  }
};

const formatMessage = (level: string, name: string, label: string, message: string): string => {
  const timestamp = new Date().toISOString();
  const identifier = label ? `${name} - ${label}` : name;
  return `${timestamp} [${identifier}] ${level.toUpperCase()} : ${message}`;
};

const createLogger = (name: string): Logger => {
  let label = null;
  const log = (level: string, ...message: unknown[]) => {
    const formattedMessage = formatMessage(level, name, label, parseMsgToString(message));
    const colorStyle = colors[level as keyof typeof colors] || "";
    console.log(`%c${formattedMessage}`, colorStyle);
  };

  return {
    setLabel: (newLabel: string) => {
      label = newLabel;
    },
    debug: (...message: unknown[]) => log("debug", ...message),
    info: (...message: unknown[]) => log("info", ...message),
    warn: (...message: unknown[]) => log("warn", ...message),
    error: (...message: unknown[]) => log("error", ...message),
  };
};

const logger = createLogger("MJ");

export default logger;
