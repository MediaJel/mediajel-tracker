import handleTag from "./tracker-config/handle-tag";
import {
  filterNullScripts,
  parseToObject,
  getAllScripts,
  findTag,
} from "./tools";
import { ContextInterface } from "./interface";
import { createContext } from "./tracker-config/utils/index";

const spPattern =
  /^[^:]+:\/\/[^/?#;]+(\/[^/]+)*?\/(i\?(tv=|.*&tv=)|com\.snowplowanalytics\.snowplow\/tp2)/i;
const plPattern = /^iglu:[^\/]+\/payload_data/i;

function isSnowplow(request): boolean {
  if (spPattern.test(request.url)) {
    return true;
  } else {
    // It's possible that the request uses a custom endpoint via postPath
    if (request.method === "POST" && typeof request.postData !== "undefined") {
      // Custom endpoints only support POST requests
      try {
        const post = JSON.parse(request.postData.text) || {};
        return (
          typeof post === "object" &&
          "schema" in post &&
          plPattern.test(post.schema)
        );
      } catch {
        // invalid JSON, not a Snowplow event
      }
    }
  }

  return false;
}

try {
  // Gathers all scripts of page where our scripts is loaded

  const scripts = getAllScripts();

  // Filters all scripts for type safety, removing this will result in an error

  const nullSafeScripts = filterNullScripts(scripts);

  // Uses our KeyWords array to filter for our Universal Tag

  const universalTag = findTag(nullSafeScripts);

  // Parses the arguments of the filterred URL to be used for our tracker

  const parsedURL = parseToObject(universalTag);

  // Creates Context object to be passed down to children functions

  const context: ContextInterface = createContext(parsedURL); // <--- Adjust code for type

  context && handleTag(context);
} catch (err) {
  // Meant to be customer facing error
  throw new Error("Please ensure you have filled in the required arguments");
}
