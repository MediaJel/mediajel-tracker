/**
 * A simulated tag, in the page: one `<script src>` on the tag's own host, appended once per page.
 *
 * It must be the tag's real URL — the tag works out where its other files live from its own
 * script's URL — and it goes into `<head>`, because the tag's loader writes its preloads there; at
 * `document_start` there may be no head yet, so this waits for the parser to make one. A page that
 * already carries this simulated copy (the bridge attached twice) is left as it is.
 */

interface Outcome {
  loaded(): void;
  failed(): void;
}

/** Calls `then` with the page's `<head>` as soon as it exists. */
const whenHead = (doc: Document, then: (head: HTMLElement) => void): void => {
  if (doc.head) {
    then(doc.head);
    return;
  }
  const observer = new MutationObserver(() => {
    if (!doc.head) return;
    observer.disconnect();
    then(doc.head);
  });
  observer.observe(doc.documentElement, { childList: true });
};

const SIMULATED_ATTRIBUTE = "data-mj-simulated";

export const installSimulatedTag = (doc: Document, url: string, outcome: Outcome): void => {
  if (doc.querySelector(`script[${SIMULATED_ATTRIBUTE}]`)) return;
  const script = doc.createElement("script");
  script.src = url;
  script.async = true;
  script.setAttribute(SIMULATED_ATTRIBUTE, "");
  script.addEventListener("load", outcome.loaded);
  script.addEventListener("error", outcome.failed);
  whenHead(doc, (head) => head.appendChild(script));
};
