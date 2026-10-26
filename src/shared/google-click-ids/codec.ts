/**
 * Storage formats for click IDs: our own cookie/localStorage value, and the values Google's tag writes.
 * Google's formats are undocumented; the parsers below match what live gtag.js wrote in a 2026-10-26 probe
 * (?gclid= → _gcl_aw "GCL.<s>.<id>", ?wbraid= → _gcl_gb "GCL.<s>.<id>", ?gbraid= → _gcl_ag "2.1.k<id>$i<s>",
 * plus the _gcl_ls localStorage record) and return null for anything else.
 */
import { CLICK_ID_NAMES, CLICK_WINDOW_SECONDS, ClickIdSet, isValidClickId, toClickIdSet } from "./click-ids";

const OWN_VERSION = "1";

/** `1.<click seconds>.<gclid>.<gbraid>.<wbraid>`, with empty segments for missing ids. */
export const encodeOwnValue = (set: ClickIdSet): string =>
  [OWN_VERSION, String(set.ts)].concat(CLICK_ID_NAMES.map((name) => set.ids[name] || "")).join(".");

export const decodeOwnValue = (value: string | null): ClickIdSet | null => {
  if (!value) return null;
  const parts = value.split(".");
  if (parts.length !== 2 + CLICK_ID_NAMES.length || parts[0] !== OWN_VERSION || !/^\d+$/.test(parts[1])) return null;
  const ids: Record<string, string> = {};
  CLICK_ID_NAMES.forEach((name, index) => {
    ids[name] = parts[index + 2];
  });
  return toClickIdSet(ids, Number(parts[1]));
};

/** `_gcl_aw` / `_gcl_gb`: `GCL.<seconds>.<id>`. */
export const parseGclCookie = (value: string | null): { id: string; ts: number } | null => {
  const match = /^GCL\.(\d{9,11})\.([^.]+)$/.exec(value || "");
  return match && isValidClickId(match[2]) ? { id: match[2], ts: Number(match[1]) } : null;
};

/** `_gcl_ag` (gbraid): `<version>.<n>.k<id>$i<seconds>`. */
export const parseGclAgCookie = (value: string | null): { id: string; ts: number } | null => {
  const match = /^\d+\.\d+\.k([^$]+)\$i(\d{9,11})(?:\$|$)/.exec(value || "");
  return match && isValidClickId(match[1]) ? { id: match[1], ts: Number(match[2]) } : null;
};

/** gtag's `_gcl_ls` localStorage record: `{"gclid":{"value":{"value":<id>,"creationTimeMs":<ms>}}}`. */
export const parseGclLocalStorage = (json: string | null): { id: string; ts: number } | null => {
  try {
    const entry = JSON.parse(json || "null")?.gclid?.value;
    if (!entry || !isValidClickId(entry.value) || typeof entry.creationTimeMs !== "number") return null;
    return { id: entry.value, ts: Math.floor(entry.creationTimeMs / 1000) };
  } catch {
    return null;
  }
};

export const formatGclCookie = (ts: number, id: string): string => `GCL.${ts}.${id}`;

/**
 * The frictionless-tag pilot's record (`mediajel_google_click_ids`: `{ids, expires}`, expires = click + 90 days in
 * ms). Read so clicks it already captured are not lost; we never write it.
 */
export const decodePilotStorage = (json: string | null): ClickIdSet | null => {
  try {
    const record = JSON.parse(json || "null");
    if (!record || typeof record.expires !== "number" || !record.ids || typeof record.ids !== "object") return null;
    return toClickIdSet(record.ids, Math.round(record.expires / 1000) - CLICK_WINDOW_SECONDS);
  } catch {
    return null;
  }
};
