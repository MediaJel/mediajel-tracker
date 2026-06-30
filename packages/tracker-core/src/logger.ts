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

const formatMessage = (level: string, name: string, label: string | null, message: string): string => {
  const timestamp = new Date().toISOString();
  const identifier = label ? `${name} - ${label}` : name;
  return `${timestamp} [${identifier}] ${level.toUpperCase()} : ${message}`;
};

// Reads the `logs` query-string flag off the tag's own <script src>. Mirrors the
// parsing in utils/get-context.ts but kept self-contained and dependency-free so it
// can run at the earliest possible point — this module is index.ts's first import,
// so the flag is resolved before any other tracker code executes.
const readLogsEnabled = (): boolean => {
  try {
    const scripts = document.getElementsByTagName("script");
    const target = (document.currentScript as HTMLScriptElement) || scripts[scripts.length - 1];
    const src = target?.src ?? "";
    const queryIndex = src.indexOf("?");
    if (queryIndex === -1) return true; // opt-out default: logging on unless explicitly disabled
    return new URLSearchParams(src.substring(queryIndex)).get("logs") !== "false";
  } catch {
    return true; // fail-safe: never let log setup break the tracker
  }
};

// Single source of truth for whether the tracker emits any console output.
// Initialized from the query string at module load (earliest point); can be
// re-applied later (e.g. after window.overrides merge) via setLoggingEnabled.
let enabled = readLogsEnabled();

export const setLoggingEnabled = (value: boolean): void => {
  enabled = value;
};

export const isLoggingEnabled = (): boolean => enabled;

export const createLogger = (name: string): Logger => {
  let label: string | null = null;
  const log = (level: string, ...message: unknown[]) => {
    if (!enabled) return;
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
