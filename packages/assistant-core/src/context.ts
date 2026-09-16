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
  /** The first MediaJel tag's parsed query string; empty when `tagPresent` is false. */
  tag: QueryStringContext;
  /** Whether a MediaJel tag was actually found on the page. */
  tagPresent: boolean;
  /**
   * Every MediaJel tag on the page, one per app ID, in document order — `tag` is the first. A
   * site can carry more than one, and each app ID has an activity record of its own.
   */
  tags: TagSummary[];
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

/** One MediaJel tag found on the page. */
export interface TagSummary {
  appId: string;
  environment: string;
  version: string;
  /**
   * The script is in the page, but a page-speed plugin is holding it back until the visitor
   * interacts — so the tag is installed and has not run.
   */
  delayed: boolean;
}

/** Where else a tag may be served from. The extension passes its own build's tag origin. */
export interface TagSearch {
  origins?: string[];
}

export const EMPTY_TAG = {
  appId: "",
  version: "",
  environment: "",
  collector: "",
  tag: "",
} as unknown as QueryStringContext;

/**
 * Page-speed plugins hold scripts back by moving the URL out of `src` into an attribute of their
 * own until the visitor interacts: WP Rocket's `data-rocket-src`, LiteSpeed's and Flying Scripts'
 * `data-lazy-src`/`data-src`, Perfmatters' `data-pmdelayedscript`. A tag delayed that way has no
 * `src` at all, and reading `src` alone reported it as missing.
 */
const DELAYED_SRC = ["data-rocket-src", "data-lazy-src", "data-src", "data-pmdelayedscript"];

/** Every attribute a tag's URL can be found in — all a copy of a script needs to carry to be read. */
export const TAG_URL_ATTRIBUTES = ["src", ...DELAYED_SRC];

/**
 * A script element as reading a tag needs it. A live element is one; so is a copy made in another
 * realm and sent across, which has attributes and a base URL but no document of its own.
 */
export interface ScriptSource {
  getAttribute(name: string): string | null;
  baseURI: string;
  outerHTML?: string;
}

/**
 * The tag is served from cnna.io in production and staging, and from localhost by the training
 * sandbox. A bare `appId` parameter is too common a name to claim on anybody else's host — a chat
 * widget's loader can carry one — while `mediajelAppId` is ours wherever it is served from.
 */
const isTagHost = (hostname: string, extra: string[]): boolean =>
  hostname === "cnna.io" ||
  hostname.endsWith(".cnna.io") ||
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  extra.includes(hostname);

const hostnamesOf = (origins: string[] = []): string[] =>
  origins.flatMap((origin) => {
    try {
      return [new URL(origin).hostname];
    } catch {
      return [];
    }
  });

/** A tag as it was found: its parsed configuration, and whether a plugin is holding it back. */
type FoundTag = { context: QueryStringContext; delayed: boolean };

const scriptUrl = (script: ScriptSource): { url: URL; delayed: boolean } | null => {
  const held = script.getAttribute("src") ? undefined : DELAYED_SRC.find((name) => script.getAttribute(name));
  const raw = script.getAttribute(held ?? "src");
  if (!raw) return null;
  try {
    return { url: new URL(raw, script.baseURI), delayed: held !== undefined };
  } catch {
    return null;
  }
};

/** A bare `appId` counts only on a tag host; `mediajelAppId` counts wherever it is served from. */
const isOurs = (url: URL, hosts: string[]): boolean =>
  url.searchParams.has("mediajelAppId") || (url.searchParams.has("appId") && isTagHost(url.hostname, hosts));

/**
 * Read a tag's configuration back out of its URL — the same query string
 * `tracker-core/utils/get-context.ts` parses, except that runs as the tag and can use
 * `document.currentScript`, and this runs beside it and cannot.
 */
const contextOf = (url: URL, script: ScriptSource): QueryStringContext => {
  const params = Object.fromEntries(url.searchParams.entries());
  const { mediajelAppId, appId, version, ...rest } = params;
  return {
    ...rest,
    appId: appId || mediajelAppId || "",
    version: version || "1",
    environment: params.environment || "production",
    collector: params.collector || "",
    tag: (script.outerHTML ?? "").replace(/&amp;/g, "&").replace(/\\"/g, '"'),
  } as unknown as QueryStringContext;
};

const readTag = (script: ScriptSource, hosts: string[]): FoundTag | null => {
  const found = scriptUrl(script);
  if (!found || !isOurs(found.url, hosts)) return null;
  return { context: contextOf(found.url, script), delayed: found.delayed };
};

/** Every MediaJel tag among these scripts, one per app ID, in the order given. */
const findTags = (scripts: ScriptSource[], search: TagSearch): FoundTag[] => {
  const hosts = hostnamesOf(search.origins);
  const seen = new Set<string>();
  const tags: FoundTag[] = [];
  for (const script of scripts) {
    const tag = readTag(script, hosts);
    if (!tag || seen.has(tag.context.appId)) continue;
    seen.add(tag.context.appId);
    tags.push(tag);
  }
  return tags;
};

const summaryOf = ({ context, delayed }: FoundTag): TagSummary => ({
  appId: String(context.appId ?? ""),
  environment: String(context.environment ?? ""),
  version: String(context.version ?? ""),
  delayed,
});

/** The MediaJel tags among a page's scripts — live elements, or copies read out of the page elsewhere. */
export const tagsAmong = (scripts: ScriptSource[], search: TagSearch = {}): TagSummary[] =>
  findTags(scripts, search).map(summaryOf);

/** The context for the page this code is running in. */
export const readPageContext = (win: Window = window, search: TagSearch = {}): PageContext => {
  const found = findTags(Array.from(win.document.getElementsByTagName("script")), search);
  return {
    tag: found[0]?.context ?? EMPTY_TAG,
    tagPresent: found.length > 0,
    tags: found.map(summaryOf),
    href: win.location.href,
    hostname: win.location.hostname,
    isOwn: () => false,
  };
};
