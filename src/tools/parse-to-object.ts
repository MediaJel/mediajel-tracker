import { getQueryString } from "../tracker-config/utils";

export function parseToObject(universalTag: HTMLScriptElement[]) {
  const context = universalTag.map((script) => {
    const src: string = script.getAttribute("src");
    const queryString: string[] = src.split("?");
    return getQueryString(queryString[1]);
  });
  return context;
}