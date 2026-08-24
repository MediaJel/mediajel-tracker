import { QueryStringContext } from "@mediajel/tracker-core/types";

/**
 * Everything a page-side subsystem is allowed to reach for.
 *
 * The recorder and its eleven sources receive one of these instead of reading `location`,
 * `document.scripts` or a store. That is what lets the same code run in three places without
 * a branch in it: the extension's main-world bridge builds one from the live page, the panel
 * builds one from the bound tab, and a test builds one from a literal.
 *
 * `tag` is never null. A page with no MediaJel tag yields an empty context and
 * `tagPresent: false`, because five call sites want `tag.appId`/`tag.environment` and a
 * nullable field would buy nothing but five guards.
 */
export interface PageContext {
  /** The MediaJel tag's parsed query string; empty when `tagPresent` is false. */
  tag: QueryStringContext;
  /** Whether a MediaJel tag was actually found on the page. */
  tagPresent: boolean;
  /** The page's address, captured so nothing below reads `location` directly. */
  href: string;
  hostname: string;
  /**
   * Whether an event or node belongs to the assistant rather than the page.
   *
   * In the extension the assistant owns no DOM inside the page, so this is `false` for
   * everything. It stays on the context because the sources call it and because anything we
   * ever do put in the page must be filterable the same way.
   */
  isOwn(target: unknown): boolean;
}

export const EMPTY_TAG = {
  appId: "",
  version: "",
  environment: "",
  collector: "",
  tag: "",
} as unknown as QueryStringContext;

/**
 * Locate the MediaJel tag on the current page and read its configuration back out of the
 * script URL — the same query string `tracker-core/utils/get-context.ts` parses, except that
 * runs as the tag and can use `document.currentScript`, and this runs beside it and cannot.
 *
 * The match is on the query string rather than the host: staging, production and a local
 * harness all serve the same tag from different origins, and `appId`/`mediajelAppId` is the
 * one thing every one of them carries.
 */
export const findTagContext = (doc: Document = document): QueryStringContext | null => {
  for (const script of Array.from(doc.getElementsByTagName("script"))) {
    const src = script.src || "";
    const query = src.slice(src.indexOf("?"));
    if (!src.includes("?") || !/[?&](appId|mediajelAppId)=/.test(query)) continue;

    const params = Object.fromEntries(new URLSearchParams(query).entries());
    const { mediajelAppId, appId, version, ...rest } = params;
    return {
      ...rest,
      appId: appId || mediajelAppId || "",
      version: version || "1",
      environment: params.environment || "production",
      collector: params.collector || "",
      tag: script.outerHTML.replace(/&amp;/g, "&").replace(/\\"/g, '"'),
    } as unknown as QueryStringContext;
  }
  return null;
};

/** The context for the page this code is running in. */
export const readPageContext = (win: Window = window): PageContext => {
  const tag = findTagContext(win.document);
  return {
    tag: tag ?? EMPTY_TAG,
    tagPresent: tag !== null,
    href: win.location.href,
    hostname: win.location.hostname,
    isOwn: () => false,
  };
};
