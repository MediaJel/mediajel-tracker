const colors = {
  debug: "#cccccc",
  info: "#4682b4",
  warn: "#ffa500",
  error: "#ff0000",
};

type LogLevel = "debug" | "info" | "warn" | "error";

const logMessage = (level: LogLevel, ...message: unknown[]): void => {
  const color = colors[level];
  console.log(`%c[${level.toUpperCase()}]`, `color: ${color}`, ...message);
};

const debug = (...message: unknown[]): void => {
  logMessage("debug", ...message);
};

const info = (...message: unknown[]): void => {
  logMessage("info", ...message);
};

const warn = (...message: unknown[]): void => {
  logMessage("warn", ...message);
};

const error = (...message: unknown[]): void => {
  logMessage("error", ...message);
};

const createLogger = (name: string) => {
  return {
    debug: (...message: unknown[]): void => debug(`[${name}]`, ...message),
    info: (...message: unknown[]): void => info(`[${name}]`, ...message),
    warn: (...message: unknown[]): void => warn(`[${name}]`, ...message),
    error: (...message: unknown[]): void => error(`[${name}]`, ...message),
  };
};

export default createLogger;
