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
    let existingIds: string[] = [];

    if(value) {
      const parsed = tryParseJSONObject(value);
      if (parsed.type === "object") {
        existingIds = parsed.value as string[];
      }

      else if (parsed.type === "string") {
        existingIds = [parsed.value as string];
      }
    }

    console.log("existingIds", existingIds);
    if (existingIds.includes(eventId)) {
      logger.warn(`${eventType} with id ${eventId} already tracked. Discarding duplicate.`);
      return;
    }

    originalMethod(input);
    localStorage.setItem(storageKey, JSON.stringify([...existingIds, eventId]));
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
