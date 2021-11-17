import { getQueryString } from "../tracker-config/utils";

export function parseToObject(universalTag: HTMLScriptElement[]) {
  const context = universalTag.map((script) => {
    const src: string = script.getAttribute("src");
    const queryString: string[] = src.split("?");
    console.log(queryString);
    return getQueryString("query string:" + queryString[1]);
  });
  return context;
}
