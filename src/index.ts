import configureTracker from "./configure-tracker";
import {
  filterNullScripts,
  getValues,
  getAllScripts,
  findTag,
  handleIsDuplicate,
  createContext,
} from "./helpers/main";
import { ContextInterface, TagContext } from "./helpers/interface";

function initializeTracker(): Boolean {
  let isSuccessful: Boolean = false;

  try {
    // Gathers all scripts of page where our scripts is loaded

    const allScripts = getAllScripts();

    // Filters all scripts for type safety, removing this will result in an error

    const nullSafeScripts = filterNullScripts(allScripts);

    // Uses our KeyWords array to filter for our Universal Tag

    const universalTag = findTag(nullSafeScripts);

    // Parses the arguments of the filterred URL to be used for our tracker

    const tagContext = getValues(universalTag);

    // Checks for duplicates

    const singleTag = handleIsDuplicate(tagContext);

    // Creates Context object to be passed down to children functions
    const context: ContextInterface = createContext(singleTag);

    context && configureTracker(context);

    // Sets success to true if no errors
    isSuccessful = true;
  } catch (err) {
    console.error(
      "An error has occured, please contact your pixel provider:" + err.message
    );
  } finally {
    return isSuccessful;
  }
}

const result: Boolean = initializeTracker();
