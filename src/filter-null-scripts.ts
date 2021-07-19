// Filters all scripts for type safety, removing this will result in an error
export default function filterNullScripts(
  scripts: HTMLCollectionOf<HTMLScriptElement>
) {
  const nullSafeScripts = Array.from(scripts).filter(
    (script: HTMLScriptElement) => script.getAttribute("src") !== null
  );

  return nullSafeScripts;
}
