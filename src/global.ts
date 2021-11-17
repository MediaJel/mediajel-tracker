import { getBasedOnKeyword } from "./tracker-config/utils";
import { ContextArg, ErrorContext } from "./interface";
import { getQueryString } from "./tracker-config/utils";
import { domains } from "./constants/domains";

// Gets all scripts within the DOM
const getAllScripts = () => {
  return document.getElementsByTagName("script");
};

// Filters all null scripts for type safety, removing this will result in an error
const filterNullScripts = (scripts: HTMLCollectionOf<HTMLScriptElement>) =>
  Array.from(scripts).filter((script) => script.getAttribute("src") !== null);

// Finds the script that contains our universal tag based on "domains" constants
const findTag = (nonNullScripts: HTMLScriptElement[]) =>
  nonNullScripts.filter((scripts) => {
    const src = scripts.getAttribute("src");
    return domains.some((domain) => src.includes(domain));
  });

// Checks if present candidate scripts is more than 1
export function handleIsDuplicate(context: ContextArg[]): ContextArg {
  if (context.length > 1) {
    const warnMessage = `Found more than one universal tag. Please remove all but one.`;
    console.error(warnMessage);
    return context[0];
  }
}

export function parseToObject(universalTag: HTMLScriptElement[]) {
  const context = universalTag.map((script) => {
    const src: string = script.getAttribute("src");
    const queryString: string[] = src.split("?");

    return getQueryString(queryString[1]);
  });
  return context;
}

export function throwError(context: ErrorContext): void {
  const { name, cause } = context;

  throw new Error(`Error located at ${name} ${cause ?? ""}`);
}
