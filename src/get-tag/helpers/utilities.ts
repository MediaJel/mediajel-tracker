import domains from "../../shared/domains";
import { TagContext } from "../../shared/types";
import { QueryStringParams } from "./types";

/**
 * Gets all of the script tags on the page
 *
 * @returns {HTMLCollectionOf<HTMLScriptElement>} All scripts within the DOM
 */
const getAllScripts = () => {
  return document.getElementsByTagName("script");
};

/**
 * Filters out all scripts that contain a "src" attribute value of "null."
 * This is to prevent errors when trying to access the "src" attribute value
 *
 * @param {HTMLCollectionOf<HTMLScriptElement>} scripts
 * @returns {HTMLScriptElement}
 */

const filterNullScripts = (scripts: HTMLCollectionOf<HTMLScriptElement>) =>
  Array.from(scripts).filter((script) => script.getAttribute("src") !== null);

/**
 * Returns the script that contains our domain for the tags
 *
 * @param {HTMLScriptElement[]} nonNullScripts scripts that have a "src" attribute value
 * @returns {HTMLScriptElement[]} The scripts that contains our domain
 */

const findTag = (nonNullScripts: HTMLScriptElement[]) =>
  nonNullScripts.filter((scripts) => {
    const src = scripts.getAttribute("src");
    return domains.some((domain) => src.includes(domain));
  });

/**
 * Parses the query string and returns the values
 *
 * @param {HTMLScriptElement[]} scripts
 * @returns {TagContext[]}
 */

const getValues = (scripts: HTMLScriptElement[]) =>
  scripts.map((script) => {
    const src: string = script.getAttribute("src");
    const queryString: string[] = src.split("?");
    return parseQueryString(queryString[1]); // -> appId=VALUE&environment=VALUE
  });

/**
 * Evaluates the array of contexts and returns the first one that matches
 * our domain. Also evaluates the array of contexts and throws an error if
 * length is greater than 1
 *
 * @param {QueryStringParams[]} context All scripts that contain our domain
 * @returns {QueryStringParams} The first script that contains our domain
 */
const removeDuplicate = (contexts: QueryStringParams[]): QueryStringParams => {
  if (contexts.length > 1) {
    const duplicateMessage = `There is/are ${
      contexts.length - 1
    } duplicate tags installed. Please remove the duplicates`;
    throw new Error(duplicateMessage);
  }
  return contexts[0]; // Only return the first tag
};

/**
 *  Creates Context object from the first index of the array
 *  retruned from the scripts that matched our criteria
 *  based on KeyWords
 *
 * @param {QueryStringParams} data
 * @returns {TagContext}
 */
const createContext = (data: QueryStringParams): TagContext => {
  const { appId, test, environment, retailId, mediajelAppId } = data;

  return {
    appId: appId ?? mediajelAppId,
    retailId,
    environment,
    collector: test
      ? process.env.MJ_STAGING_COLLECTOR_URL
      : process.env.MJ_PRODUCTION_COLLECTOR_URL,
  };
};

/**
 * Parses the query string to get the context
 *
 * @param url
 * @returns
 */

const parseQueryString = (url: string): QueryStringParams => {
  const result = {};
  const parsedUrl = url;
  const context: QueryStringParams = result;

  const inputData = (key, val) => {
    if (result[key] === undefined) {
      result[key] = val;
    }
  };

  if (!parsedUrl) throw new Error("There is no query.");

  if (parsedUrl.includes("&")) {
    parsedUrl.split("&").forEach((x) => {
      const [param, value] = x.split("=");
      inputData(param, value);
    });
  } else {
    const [param, value] = parsedUrl.split("=");
    inputData(param, value);
  }

  return context;
};

export {
  getAllScripts,
  filterNullScripts,
  findTag,
  removeDuplicate,
  getValues,
  createContext,
};
