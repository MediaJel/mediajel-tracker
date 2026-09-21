import { TagSearch, isTagUrl } from "./context";

/**
 * A tag simulated on a site: installed from its URL in this browser only, on every page of the
 * site, until it is paused or removed — the way an engineer tries a tag before a client installs
 * it. Kept by the extension per site; nothing about it leaves the browser.
 */

/** The tag a simulation loads, by its URL and the app ID that URL names. */
export interface SimulatedInstall {
  url: string;
  appId: string;
}

export interface SiteSimulation {
  v: 1;
  site: string;
  /** Paused keeps the simulation and loads nothing. */
  enabled: boolean;
  install: SimulatedInstall | null;
  updatedAt: number;
}

/** What the page said about the simulation on its latest load. */
export interface SimulationOnPage {
  /** The simulated tag's script did not load: the page's security policy, or the tag's host, refused it. */
  installFailed: boolean;
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

/** The command a page needs for a simulation: the tag to load, or nothing when there is none to load. */
export const installOf = (simulation: SiteSimulation | null): string | null =>
  simulation?.enabled && simulation.install ? simulation.install.url : null;
