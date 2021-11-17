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

function initializeTracker(): Boolean {
  let isSuccessful: Boolean = false;

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
    const context: ContextInterface = createContext(isDuplicate);

    // Pass down tag context to execute the appropriate tag through handleTag
    context && handleTag(context);

    // Sets success to true if no errors
    isSuccessful = true;
  } catch (err) {
    // Adds additional context if new Error provided within the previous functions

    console.error(
      "An error has occured, please contact your pixel provider" + err
    );
  } finally {
    return isSuccessful;
  }
}

const result: Boolean = initializeTracker();
