import { createLogger } from "src/shared/logger";
import { SnowplowTracker } from "../types";

interface TryParseJSONObjectResult {
  type: "object" | "array" | "string";
  value: object | string;
}
// add a check to check if the jsonString is an array
function tryParseJSONObject(jsonString: string): TryParseJSONObjectResult {
  try {
    var o: object = JSON.parse(jsonString);
    if (o && typeof o === "object") {
      return { type: "object", value: o };
    }
    if (Array.isArray(o)) {
      return { type: "array", value: o };
    }
  } catch (e) {
    return { type: "string", value: jsonString };
  }
}

const withDeduplicationExtension = (snowplow: SnowplowTracker) => {
  const logger = createLogger("MJ:Deduplication");
  const {
    trackTransaction: originalTrackTransaction,
    trackAddToCart: originalTrackAddToCart,
    trackRemoveFromCart: originalTrackRemoveFromCart,
  } = snowplow.ecommerce;

  const { trackSignup: originalTrackSignup } = snowplow;

  const getStorageKey = (eventType: string) => `${snowplow.context.appId}_${eventType}`;

  const deduplicateEvent = <T>(
    originalMethod: (input: T) => void,
    eventType: string,
    input: T,
    idField: (keyof T)[],
  ) => {
    const storageKey = getStorageKey(eventType);
    const eventId = idField.map((key) => input[key]).join(":");
    let value: string | null = localStorage.getItem(storageKey);
    const trackedIds: string[] = [];

    if (value) {
      const parsed = tryParseJSONObject(value);

      if (parsed.type === "array") {
        const value = parsed.value as string[];
        // If an array, add all the ids to the trackedIds array
        trackedIds.push(...value);

        if (value.includes(eventId)) {
          logger.warn(`${eventType} with id ${eventId} already tracked. Discarding duplicate event.`);
          return;
        }
      }

      if (parsed.type === "object") {
        const value = parsed.value as object;
        // This really shouldn't happen, but just in case
        logger.error(`Storing object in localStorage is not supported. Resetting to empty array.`);
        localStorage.setItem(storageKey, JSON.stringify([]));
        return;
      }

      if (parsed.type === "string") {
        const value = parsed.value as string;

        // If a string, add the id to the trackedIds array
        if (value.includes(eventId)) {
          logger.warn(`${eventType} with id ${eventId} already tracked. Discarding duplicate event.`);
          return;
        }

        trackedIds.push(value);
      }
    }

    originalMethod(input);

    localStorage.setItem(storageKey, JSON.stringify(trackedIds));
  };

  snowplow.ecommerce.trackTransaction = (input) =>
    deduplicateEvent(originalTrackTransaction, "transaction", input, ["id"]);

  snowplow.ecommerce.trackAddToCart = (input) =>
    deduplicateEvent(originalTrackAddToCart, "addToCart", input, ["name", "quantity"]);

  snowplow.ecommerce.trackRemoveFromCart = (input) =>
    deduplicateEvent(originalTrackRemoveFromCart, "removeFromCart", input, ["name", "quantity"]);

  snowplow.trackSignup = (input) => deduplicateEvent(originalTrackSignup, "signUp", input, ["uuid", "emailAddress"]);

  return snowplow;
};

export default withDeduplicationExtension;
