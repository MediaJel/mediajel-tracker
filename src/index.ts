import { ContextInterface } from "./interface";
import handleTag from "./trackerConfig/handle-tag";
import createContext from "./trackerConfig/utils/create-context";
import getQueryString from "./trackerConfig/utils/get-query-string";
import getBasedOn from "./trackerConfig/utils/get-based-on";

// Gathers all scripts of page
const scripts: HTMLCollectionOf<HTMLScriptElement> =
  document.getElementsByTagName("script");

const allScripts: HTMLScriptElement[] = Array.from(scripts).filter(
  (script: HTMLScriptElement) => script.getAttribute("src") !== null
);

const filterredURL: HTMLScriptElement[] = allScripts.filter(
  (data: HTMLScriptElement) => {
    const pixel: string = data.getAttribute("src");
    return pixel.includes("appId");
  }
);

const parsedURL = filterredURL.map((script) => {
  const src: string = script.getAttribute("src");

  if (getBasedOn(src)) {
    const queryString: string[] = src.split("?");
    return getQueryString(queryString[1]);
  } else throw Error("No Valid arguments provided");
});

if (parsedURL) {
  const context: ContextInterface = createContext(parsedURL); // <--- Adjust code for type
  context && handleTag(context);
}
