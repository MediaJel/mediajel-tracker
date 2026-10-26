/**
 * Google Ads click IDs: what counts as one, how it is read from a page URL, and which stored click wins.
 * Pure functions (no window access) so they can be unit-tested with bun.
 */

export type ClickIdName = "gclid" | "gbraid" | "wbraid";
export type ClickIds = Partial<Record<ClickIdName, string>>;

/** A click's IDs and when the visitor clicked the ad, in seconds since the epoch. */
export interface ClickIdSet {
  ids: ClickIds;
  ts: number;
}

export const CLICK_ID_NAMES: ClickIdName[] = ["gclid", "gbraid", "wbraid"];

/** Google Ads' longest click-through conversion window. */
export const CLICK_WINDOW_SECONDS = 90 * 24 * 60 * 60;

const CLOCK_SKEW_SECONDS = 5 * 60;
const CLICK_ID_PATTERN = /^[A-Za-z0-9_-]{8,512}$/;

export const isValidClickId = (value: unknown): value is string =>
  typeof value === "string" && CLICK_ID_PATTERN.test(value);

const hasValidIds = (ids: ClickIds): boolean => {
  const names = CLICK_ID_NAMES.filter((name) => ids[name] !== undefined);
  return names.length > 0 && names.every((name) => isValidClickId(ids[name]));
};

/**
 * A click set built from untrusted input (storage, a frame message): only known ID names are kept, and the result is
 * null unless at least one is present, every present one is valid, and the click time is a number.
 */
export const toClickIdSet = (source: Record<string, unknown>, ts: unknown): ClickIdSet | null => {
  const ids: ClickIds = {};
  CLICK_ID_NAMES.forEach((name) => {
    if (source[name] !== undefined && source[name] !== "") ids[name] = source[name] as string;
  });
  return typeof ts === "number" && isFinite(ts) && hasValidIds(ids) ? { ids, ts } : null;
};

// A gclid tagged with a gclsrc that isn't Google Ads (e.g. "ds", Search Ads 360) is not ours to attribute.
const idsFromParams = (params: URLSearchParams): ClickIds => {
  const ids: ClickIds = {};
  const gclsrc = params.get("gclsrc");
  CLICK_ID_NAMES.forEach((name) => {
    const value = params.get(name);
    if (!isValidClickId(value)) return;
    if (name === "gclid" && gclsrc !== null && gclsrc.indexOf("aw") === -1) return;
    ids[name] = value;
  });
  return ids;
};

/** Click IDs in a URL's query string, or in the query part of a hash route (`#/menu?gclid=…`). */
export const clickIdsFromUrl = (url: string, nowSec: number): ClickIdSet | null => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  const hashQuery = parsed.hash.indexOf("?") === -1 ? "" : parsed.hash.slice(parsed.hash.indexOf("?"));
  const ids = { ...idsFromParams(new URLSearchParams(hashQuery)), ...idsFromParams(parsed.searchParams) };
  return Object.keys(ids).length > 0 ? { ids, ts: nowSec } : null;
};

const isWellFormed = (set: ClickIdSet | null): set is ClickIdSet =>
  !!set && typeof set.ts === "number" && hasValidIds(set.ids);

const inWindow = (ts: number, nowSec: number): boolean =>
  ts >= nowSec - CLICK_WINDOW_SECONDS && ts <= nowSec + CLOCK_SKEW_SECONDS;

const sameIds = (a: ClickIds, b: ClickIds): boolean => CLICK_ID_NAMES.every((name) => a[name] === b[name]);

/**
 * The click to keep among several sources: the newest one still inside the 90-day window. A click seen in several
 * places keeps the earliest time any of them recorded, even when that time is already past the window, so re-reading
 * it (a reload, the back button, gtag rewriting _gcl_aw after seeing the carried URL) never extends or revives it.
 */
export const pickLatest = (sets: (ClickIdSet | null)[], nowSec: number): ClickIdSet | null => {
  const known = sets.filter(isWellFormed);
  const firstSeen = (set: ClickIdSet): number =>
    known.filter((other) => sameIds(other.ids, set.ids)).reduce((ts, other) => Math.min(ts, other.ts), set.ts);
  const usable = known.map((set) => ({ ids: set.ids, ts: firstSeen(set) })).filter((set) => inWindow(set.ts, nowSec));
  if (usable.length === 0) return null;
  return usable.reduce((best, set) => (set.ts > best.ts ? set : best));
};
