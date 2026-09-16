import { Storage } from "@plasmohq/storage";

import { appIdsInBeacon } from "~/lib/beacons";
import { siteOf } from "~/lib/site";

/**
 * The MediaJel tags each tab's page has been heard sending events from — continuously, however
 * and whenever the tag loaded.
 *
 * A tag can arrive late: GTM, a page-speed plugin holding it until the visitor interacts, a loader
 * of the client's own. Reading the page for it answers at one moment; listening to the requests
 * the page makes to MediaJel's collectors answers for as long as the tag keeps sending, and every
 * event it sends names its app ID. This is how Snowplow Inspector finds trackers too — from the
 * events on the wire, not from the page — and it needs nothing to run in the page at all.
 *
 * Kept in session storage rather than in memory: the service worker is stopped after thirty seconds
 * of quiet, and a page view sent a minute before the panel opened must not have been forgotten.
 */

interface Heard {
  site: string;
  appIds: string[];
}

const area = new Storage({ area: "session" });

const keyOf = (tabId: number): string => `beacons/${tabId}`;

/** The app IDs heard from this tab while it was on this site. */
export const heardTags = async (tabId: number, site: string): Promise<string[]> => {
  const entry = await area.get<Heard>(keyOf(tabId));
  return entry?.site === site ? entry.appIds : [];
};

/** One write per tab at a time, so two beacons landing together cannot overwrite each other. */
const writes = new Map<number, Promise<unknown>>();

/**
 * Records the app IDs a beacon named. Resolves to the tab's whole list when it grew, or null when
 * every one was already known — so only news is pushed to the panel.
 */
export const hear = (tabId: number, site: string, appIds: string[]): Promise<string[] | null> => {
  const next = (writes.get(tabId) ?? Promise.resolve()).then(async () => {
    const known = await heardTags(tabId, site);
    const fresh = appIds.filter((appId) => !known.includes(appId));
    if (fresh.length === 0) return null;
    const all = [...known, ...fresh];
    await area.set(keyOf(tabId), { site, appIds: all } satisfies Heard);
    return all;
  });
  writes.set(
    tabId,
    next.catch(() => undefined),
  );
  return next;
};

const bodyOf = (details: chrome.webRequest.OnBeforeRequestDetails): string | undefined => {
  const bytes = details.requestBody?.raw?.[0]?.bytes;
  return bytes ? new TextDecoder().decode(bytes) : undefined;
};

/** What a request to a collector says, if anything: the page it came from and the tags it named. */
const heardIn = (details: chrome.webRequest.OnBeforeRequestDetails): { site: string; appIds: string[] } | null => {
  const site = siteOf(details.initiator ?? "");
  if (details.tabId < 0 || !site) return null;
  const appIds = appIdsInBeacon({ url: details.url, body: bodyOf(details) });
  return appIds.length > 0 ? { site, appIds } : null;
};

/**
 * Listens to every tab's requests to MediaJel's collectors, and calls back with a tab's full list
 * whenever a tag is heard there for the first time. Registered once, at the top of the worker.
 */
export const listenForTags = (onHeard: (tabId: number, site: string, appIds: string[]) => void): void => {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      const heard = heardIn(details);
      if (heard) {
        void hear(details.tabId, heard.site, heard.appIds).then(
          (all) => all && onHeard(details.tabId, heard.site, all),
        );
      }
      return undefined;
    },
    { urls: ["*://*.cnna.io/*"] },
    ["requestBody"],
  );
  chrome.tabs.onRemoved.addListener((tabId) => void area.remove(keyOf(tabId)));
};
