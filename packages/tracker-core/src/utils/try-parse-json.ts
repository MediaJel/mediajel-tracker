import logger from "@mediajel/tracker-core/logger";

// `unknown` in: accepts retyped client globals (e.g. window.transactionOrder) and
// raw strings without a cast. `any` out: parsed client data is unvalidated, so this
// is the deliberate honest boundary where the shape becomes the caller's concern.
export const tryParseJSONObject = (event: unknown): any => {
  try {
    if (event && typeof event === "object") {
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
