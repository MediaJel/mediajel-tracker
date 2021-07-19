import { getBasedOnKeyword } from "./trackerConfig/utils";

export default function findTag(nullSafeScripts: HTMLScriptElement[]) {
  const universalTag: HTMLScriptElement[] = nullSafeScripts.filter(
    (data: HTMLScriptElement) => {
      const pixel: string = data.getAttribute("src");
      return getBasedOnKeyword(pixel);
    }
  );
  return universalTag;
}
