/**
 * Every key the extension writes, in one place.
 *
 * All of it lives in `chrome.storage.local`. Not `sync`: a session runs to a megabyte and the
 * sync area caps a single item around 8 KB, so a synced job would be silently dropped rather
 * than saved — and a recording of a client's checkout has no business being replicated to
 * every browser the engineer signs into anyway.
 */

export const AUTH_KEY = "auth";
export const SETTINGS_KEY = "settings";
export const JOBS_INDEX_KEY = "jobs/index";

/** One job per site. The hostname is the identity — it is also the deploy target's name. */
export const jobKey = (site: string): string => `jobs/${site}`;

/** The site a job key belongs to, or null for any other key. */
export const siteFromJobKey = (key: string): string | null =>
  key.startsWith("jobs/") && key !== JOBS_INDEX_KEY ? key.slice("jobs/".length) : null;
