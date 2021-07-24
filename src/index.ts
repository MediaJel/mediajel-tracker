import handleTag from "./tracker-config/handle-tag";
import {
  filterNullScripts,
  parseToObject,
  getAllScripts,
  findTag,
  handleIsDuplicate,
} from "./tools";
import { ContextInterface } from "./interface";
import { createContext } from "./tracker-config/utils/index";

try {
  // Gathers all scripts of page where our scripts is loaded

  const scripts = getAllScripts();

  // Filters all scripts for type safety, removing this will result in an error

  const nullSafeScripts = filterNullScripts(scripts);

  // Uses our KeyWords array to filter for our Universal Tag

  const universalTag = findTag(nullSafeScripts);

  // Parses the arguments of the filterred URL to be used for our tracker

  const parsedURL = parseToObject(universalTag);

  // Checks for duplicates
  const isDuplicate = handleIsDuplicate(parsedURL);

  // Creates Context object to be passed down to children functions

  const context: ContextInterface = createContext(isDuplicate); // <--- Adjust code for type

  context && handleTag(context);
} catch (err) {
  // Meant to be customer facing error
  throw new Error("An error has occured, please contact your pixel provider");
}
