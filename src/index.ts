import handleTag from "./trackerConfig/handle-tag";
import getAllScripts from "./get-all-scripts";
import filterNullScripts from "./filter-null-scripts";
import findTag from "./find-tag";
import parseToObject from "./parse-to-object";
import { ContextInterface } from "./interface";
import { createContext } from "./trackerConfig/utils/index";

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
