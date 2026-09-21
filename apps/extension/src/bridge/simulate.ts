import type { PageSimulation } from "@mediajel/assistant-core/simulation";
import { recogniseCustomTag } from "@mediajel/assistant-core/wire/custom-tags";

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

type Tried = PageSimulation["tried"];

/** The name the page's tried versions are kept under, which a deployed block of another version defers to. */
const TRIED_VERSIONS = "__mediajelAssistantOverrides";

/** The edited tag a request is for, when it is that tag's app-id file. */
const editedFor = (url: string, tried: Tried): string | null => {
  const file = recogniseCustomTag(url);
  return file?.scope === "app-id" && tried[file.name] ? file.name : null;
};

const urlOf = (input: RequestInfo | URL, base: string): string => {
  const raw = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
  try {
    return new URL(raw, base).href;
  } catch {
    return raw;
  }
};

/** The file's own code, or none when there is no file — a deploy would create one holding only the block. */
const codeOf = (response: Response): Promise<string> => (response.ok ? response.text() : Promise.resolve(""));

/** Tags whose app-id file was fetched before the edits were armed: they ran without them. */
const lateFor = (win: Window, tried: Tried): string[] => {
  const fetched = win.performance?.getEntriesByType?.("resource") ?? [];
  const late = fetched.map((entry) => editedFor(entry.name, tried)).filter((appId): appId is string => appId !== null);
  return [...new Set(late)];
};

/**
 * Edits to a tag's configuration, tried on this page: each edited tag's app-id file is served with
 * the block the assistant service rendered appended to it — so the block runs exactly where a
 * deploy puts it, last, after the domain file's and the app-id file's own code. A file that does not
 * exist is served as the block alone, which is the file a deploy would create.
 *
 * The page's `fetch` is wrapped only while edits are armed, and only those files are touched; every
 * other request goes through as it came. The tried versions are named on the page, so a block
 * already deployed to the file, of another version, stands aside for the one being tried.
 */
export const serveEdits = (win: Window, tried: Tried): { late: string[]; stop(): void } => {
  const page = win as unknown as Record<string, unknown>;
  page[TRIED_VERSIONS] = Object.fromEntries(Object.entries(tried).map(([appId, edit]) => [appId, edit.version]));
  const original = win.fetch;
  const wrapped = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const appId = editedFor(urlOf(input, win.location.href), tried);
    if (!appId) return original.call(win, input, init);
    const code = await original.call(win, input, init).then(codeOf, () => "");
    return new Response(`${code}\n${tried[appId].block}\n`, {
      status: 200,
      headers: { "content-type": "text/javascript" },
    });
  };
  win.fetch = wrapped;
  return {
    late: lateFor(win, tried),
    stop: () => {
      if (win.fetch === wrapped) win.fetch = original;
      delete page[TRIED_VERSIONS];
    },
  };
};
