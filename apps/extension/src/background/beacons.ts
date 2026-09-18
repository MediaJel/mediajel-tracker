import { appIdsInBeacon } from "~/lib/beacons";
import { siteOf } from "~/lib/site";

/**
 * The MediaJel tags each tab's page is heard sending events from — continuously, however and
 * whenever the tag loaded.
 *
 * Listening to the requests the page makes to MediaJel's collectors answers for as long as the
 * tag keeps sending, and every event it sends names its app ID. This is how Snowplow Inspector
 * finds trackers too — from the events on the wire, not from the page — and it needs nothing to
 * run in the page at all. What is heard is handed to the tab's owner (`tag-state.ts`), which
 * remembers it and tells the panel only when it is news.
 */

const bodyOf = (details: chrome.webRequest.OnBeforeRequestDetails): string | undefined => {
  const bytes = details.requestBody?.raw?.[0]?.bytes;
  return bytes ? new TextDecoder().decode(bytes) : undefined;
};

/**
 * What a request to a collector says, if anything: the page it came from and the tags it named.
 *
 * Only the tab's own page is heard, never a frame inside it. A request names its sender's origin,
 * not the tab's, so an embedded menu on another host sending events of its own would read as the
 * tab having moved to that host — and replace the page's list with the frame's.
 */
export const heardIn = (
  details: chrome.webRequest.OnBeforeRequestDetails,
): { site: string; appIds: string[] } | null => {
  const site = details.frameId === 0 ? siteOf(details.initiator ?? "") : null;
  if (details.tabId < 0 || !site) return null;
  const appIds = appIdsInBeacon({ url: details.url, body: bodyOf(details) });
  return appIds.length > 0 ? { site, appIds } : null;
};

/**
 * Listens to every tab's requests to MediaJel's collectors, and calls back with the app IDs each
 * beacon named. Registered once, at the top of the worker.
 */
export const listenForTags = (onHeard: (tabId: number, site: string, appIds: string[]) => void): void => {
  chrome.webRequest.onBeforeRequest.addListener(
    (details) => {
      const heard = heardIn(details);
      if (heard) onHeard(details.tabId, heard.site, heard.appIds);
      return undefined;
    },
    { urls: ["*://*.cnna.io/*"] },
    ["requestBody"],
  );
};
