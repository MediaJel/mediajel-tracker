import logger from "src/shared/logger";

export const tryParseJSONObject = (event: string | object): string | object | any => {
  try {
    if (typeof event === "object") {
      return event;
    }
    if (typeof event === "string") {
      return JSON.parse(event);
    }
  } catch (e) {
    logger.error("Error parsing event:", e);
  }

  return event;
};
