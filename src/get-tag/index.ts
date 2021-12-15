import {} from "../shared/interface";
import {
  filterNullScripts,
  getValues,
  getAllScripts,
  findTag,
  removeDuplicate,
  createContext,
} from "./helpers/utilities";

const getContext = () => {
  // Gathers all scripts of page where our scripts is loaded
  const allScripts = getAllScripts();

  // Filters all scripts for type safety, removing this will result in an error
  const nullSafeScripts = filterNullScripts(allScripts);

  // Uses our KeyWords array to filter for our Universal Tag
  const universalTag = findTag(nullSafeScripts);

  // Parses the arguments of the filterred URL to be used for our tracker
  const tagContext = getValues(universalTag);

  // Checks for duplicates
  const primaryTag = removeDuplicate(tagContext);

  // Creates Context object to be passed down to children functions
  return createContext(primaryTag);
};

export default getContext;
