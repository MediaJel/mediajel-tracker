import { ContextInterface } from "./interface";
import handleTag from "./trackerConfig/handle-tag";
import createContext from "./trackerConfig/utils/create-context";
import getQueryString from "./trackerConfig/utils/get-query-string";
import getBasedOnKeyword from "./trackerConfig/utils/get-based-on-keyword";

// Gathers all scripts of page where our scripts is loaded
const scripts: HTMLCollectionOf<HTMLScriptElement> =
  document.getElementsByTagName("script");

// Filters all scripts for type safety, removing this will result in an error
const allScripts: HTMLScriptElement[] = Array.from(scripts).filter(
  (script: HTMLScriptElement) => script.getAttribute("src") !== null
);

// Uses our KeyWords array to filter for our Universal Tag
const filterredURL: HTMLScriptElement[] = allScripts.filter(
  (data: HTMLScriptElement) => {
    const pixel: string = data.getAttribute("src");
    return getBasedOnKeyword(pixel);
  }
);

// Parses the arguments of the filterred URL to be used for our tracker
const parsedURL = filterredURL.map((script) => {
  const src: string = script.getAttribute("src");
  const queryString: string[] = src.split("?");
  return getQueryString(queryString[1]);
});

if (parsedURL) {
  const context: ContextInterface = createContext(parsedURL); // <--- Adjust code for type
  context && handleTag(context);
}
