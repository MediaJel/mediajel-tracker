import { TagSearch, isTagUrl } from "./context";

/**
 * A tag simulated on a site, in this browser only, on every page of the site until it is paused or
 * removed: a tag installed from its URL — the way an engineer tries a tag before a client installs
 * it — and edits to a tag's configuration, tried before they are deployed. Kept by the extension
 * per site.
 */

/** The tag a simulation loads, by its URL and the app ID that URL names. */
export interface SimulatedInstall {
  url: string;
  appId: string;
}

/**
 * An edit to a tag's configuration, tried on the site: the params, and the block the assistant
 * service rendered for them — byte for byte what a deploy writes — with the version the page names
 * so a deployed block of another version stands aside. Keyed by the app ID the tag's URL names,
 * which is the key the tag reads `window.overrides` by.
 */
export interface TriedEdit {
  edits: Record<string, string>;
  /** Empty for an edit that takes a deployed block out: the page then runs the file without it. */
  block: string;
  version: string;
  /**
   * The edit was committed. The page runs it from here until the tag's CDN serves the file that
   * carries it, and then it is no longer tried.
   */
  deployed?: { commitUrl: string; fileUrl: string; at: number };
}

export interface SiteSimulation {
  v: 1;
  site: string;
  /** Paused keeps the simulation and loads nothing. */
  enabled: boolean;
  install: SimulatedInstall | null;
  tried: Record<string, TriedEdit>;
  updatedAt: number;
}

/** What the page said about the simulation on its latest load. */
export interface SimulationOnPage {
  /** The simulated tag's script did not load: the page's security policy, or the tag's host, refused it. */
  installFailed: boolean;
  /** Tags that fetched their app-id file before the edits reached the page, so ran without them. */
  late: string[];
}

/** A site's simulation as the panel reads it: what is kept, and what the page did with it. */
export interface SimulationView {
  simulation: SiteSimulation | null;
  page: SimulationOnPage | null;
}

export type ParsedTagUrl =
  | { ok: true; url: string; appId: string; params: Record<string, string> }
  | { ok: false; reason: string };

const WHOLE_URL = "Paste the tag's whole URL, starting with https://.";

const urlOf = (input: string): URL | null => {
  try {
    const url = new URL(input);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
};

/** The app ID the tag reads off its URL: `appId`, else the legacy `mediajelAppId`. */
const appIdOf = (url: URL): string => url.searchParams.get("appId") || url.searchParams.get("mediajelAppId") || "";

/**
 * The tag works out where its other files live from its own script's URL, and a raw `/` in the
 * query string moves that; re-encoding the query keeps every value while escaping it.
 */
const normalized = (url: URL): URL => {
  const copy = new URL(url.href);
  copy.search = new URLSearchParams(url.search).toString();
  return copy;
};

const refusalOf = (url: URL | null, search: TagSearch): string => {
  if (!url) return WHOLE_URL;
  if (!appIdOf(url)) return "The URL names no appId, so the tag would not start.";
  return isTagUrl(url, search) ? "" : `That isn't a MediaJel tag URL: it is served from ${url.hostname}.`;
};

/**
 * A pasted tag URL read the way the tag reads it: its app ID and every parameter it carries, in
 * the order given — the tag's configuration as an object — or why it cannot be simulated. An
 * empty input is not a refusal; it has nothing to say yet.
 */
export const parseTagUrl = (input: string, search: TagSearch = {}): ParsedTagUrl => {
  const trimmed = input.trim();
  if (!trimmed) return { ok: false, reason: "" };
  const url = urlOf(trimmed);
  const reason = refusalOf(url, search);
  if (reason || !url) return { ok: false, reason: reason || WHOLE_URL };
  const clean = normalized(url);
  return { ok: true, url: clean.href, appId: appIdOf(clean), params: Object.fromEntries(clean.searchParams) };
};

/** What a page is asked to run for a simulation: the tag to load, and each edited tag's block. */
export interface PageSimulation {
  install: string | null;
  tried: Record<string, { block: string; version: string }>;
}

const blocksOf = (tried: Record<string, TriedEdit>): PageSimulation["tried"] =>
  Object.fromEntries(
    Object.entries(tried).map(([appId, edit]) => [appId, { block: edit.block, version: edit.version }]),
  );

/** The command a page needs for a simulation, or nothing while it is paused or holds nothing to run. */
export const commandOf = (simulation: SiteSimulation | null): PageSimulation | null => {
  if (!simulation?.enabled) return null;
  const command = { install: simulation.install?.url ?? null, tried: blocksOf(simulation.tried) };
  return command.install || Object.keys(command.tried).length > 0 ? command : null;
};

/**
 * Every `environment` the tag has an adapter for — the `case` labels of the tag's own switches
 * (`apps/tracker/src/adapters/ecommerce.ts`, and `impressions.ts` for impression tags) — offered as
 * suggestions when an environment is edited. A test holds this list to those files.
 */
export const ENVIRONMENTS: readonly string[] = [
  "bigcommerce",
  "blaze",
  "buddi",
  "carrot",
  "dispense",
  "drupal",
  "dutchie",
  "dutchie-iframe",
  "dutchie-subdomain",
  "dutchieplus",
  "ecwid",
  "evenue",
  "exercise",
  "flowhub",
  "foxy",
  "grassdoor",
  "greenrush",
  "iqmetrix",
  "jane",
  "leafly",
  "lightspeed",
  "liquidm",
  "magento",
  "mantis",
  "meadow",
  "olla",
  "posabit",
  "shopify",
  "simplifi",
  "square",
  "sticky-leaf",
  "sweed",
  "thirdparty",
  "ticketmaster",
  "ticketure",
  "tnew",
  "training",
  "treez",
  "tymber",
  "weave",
  "webjoint",
  "wefunder",
  "wix",
  "woocommerce",
  "yotpo",
];
