import { getBasedOnKeyword } from "../tracker-config/utils";

export function findTag(nullSafeScripts: HTMLScriptElement[]) {
  const universalTag: HTMLScriptElement[] = nullSafeScripts.filter(
    (data: HTMLScriptElement) => {
      const pixel: string = data.getAttribute("src");
      return getBasedOnKeyword(pixel);
    }
  );
  return universalTag;
}
