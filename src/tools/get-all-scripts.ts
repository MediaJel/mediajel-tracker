export function getAllScripts(): HTMLCollectionOf<HTMLScriptElement> {
  const scripts: HTMLCollectionOf<HTMLScriptElement> =
    document.getElementsByTagName("script");
  return scripts;
}
