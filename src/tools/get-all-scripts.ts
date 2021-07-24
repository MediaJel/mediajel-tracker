import { throwError } from "./throw-error";

export function getAllScripts(): HTMLCollectionOf<HTMLScriptElement> {
  try {
    const scripts: HTMLCollectionOf<HTMLScriptElement> =
      document.getElementsByTagName("script");
    return scripts;
  } catch {
    throwError({
      name: "getAllScripts",
      cause: "Error getting DOM script elements",
    });
  }
}
