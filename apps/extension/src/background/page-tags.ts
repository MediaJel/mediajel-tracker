import { ScriptSource, TAG_URL_ATTRIBUTES, TagSummary, tagsAmong } from "@mediajel/assistant-core/context";

import { TAG_SEARCH } from "~/lib/tags";

/** A script element as it leaves the page: the attributes a tag's URL can be in, its base URL, and its markup. */
interface ScriptCopy {
  attributes: Record<string, string | null>;
  baseURI: string;
  /** Capped: enough to read every attribute, never a page's inline code. */
  outerHTML: string;
}

/**
 * Copies of the page's scripts that carry a URL in one of `attributes`.
 *
 * This runs in the tab, not in the worker: `chrome.scripting` sends the function's source text, so it
 * may use nothing but its argument and the page's DOM — no imports and no helpers from this module,
 * which is why the markup cap is a literal here rather than `ELEMENT_CHAR_CAP`.
 */
export const copyTagScripts = (attributes: string[]): ScriptCopy[] => {
  const copies: ScriptCopy[] = [];
  const scripts = document.getElementsByTagName("script");
  for (let i = 0; i < scripts.length; i += 1) {
    const values: Record<string, string | null> = {};
    let carriesUrl = false;
    for (const name of attributes) {
      values[name] = scripts[i].getAttribute(name);
      carriesUrl = carriesUrl || Boolean(values[name]);
    }
    if (carriesUrl) {
      copies.push({ attributes: values, baseURI: scripts[i].baseURI, outerHTML: scripts[i].outerHTML.slice(0, 2048) });
    }
  }
  return copies;
};

const sourceOf = (copy: ScriptCopy): ScriptSource => ({
  baseURI: copy.baseURI,
  outerHTML: copy.outerHTML,
  getAttribute: (name) => copy.attributes[name] ?? null,
});

/**
 * The MediaJel tags in a tab's page, read by this worker at the moment it asks — or null when the page
 * cannot be read at all (Chrome's own pages, the Web Store, a tab that has closed), which is not the
 * same thing as a page without tags.
 *
 * The page bridge reports tags too, but over a connection this worker does not keep: Chrome stops the
 * worker after thirty idle seconds and the connection goes with it, and a tab that was open before the
 * extension was loaded or updated has no bridge at all. Either left the panel waiting for a report that
 * could not come. A tag that arrives after the page loads — next/script's afterInteractive, GTM — is in
 * the page by the time anyone opens the panel, so reading it then finds it.
 */
export const readTagsOnPage = async (tabId: number): Promise<TagSummary[] | null> => {
  try {
    const [frame] = await chrome.scripting.executeScript({
      target: { tabId },
      func: copyTagScripts,
      args: [TAG_URL_ATTRIBUTES],
    });
    return Array.isArray(frame?.result) ? tagsAmong(frame.result.map(sourceOf), TAG_SEARCH) : null;
  } catch {
    return null;
  }
};
