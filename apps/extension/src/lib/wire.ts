import { RecordedTag } from "@mediajel/assistant-core/tags";
import { decodeCollectorRequest } from "@mediajel/assistant-core/wire/decode";
import { Outcome, PendingEvent } from "@mediajel/assistant-core/wire/types";

import { siteOf } from "~/lib/site";

/**
 * What the wire says, read off `chrome.webRequest` — pure over the details Chrome hands a listener.
 *
 * Every event a MediaJel tag sends goes to its collector on a `*.cnna.io` host and names its app
 * ID; the request needs nothing in the page to be heard, and arrives for as long as the tag keeps
 * sending, however it was loaded. A request's body reaches a listener in chunks; every chunk is
 * read, because a batch of events is one document and the app IDs of the last events in it are in
 * the last chunk. Its outcome arrives later, by request id.
 */

/** A custom-tag host of the build's own — a staging bucket — is heard as well; the production one is on cnna.io already. */
const customTagPattern = (base: string): string[] => {
  try {
    const { hostname } = new URL(base);
    return hostname.endsWith("cnna.io") ? [] : [`*://${hostname}/*`];
  } catch {
    return [];
  }
};

/** The URL patterns the listeners are registered for. */
export const WIRE_URLS: string[] = [
  "*://*.cnna.io/*",
  ...customTagPattern((process.env.PLASMO_PUBLIC_FRICTIONLESS_CUSTOMTAG_URL ?? "").trim()),
];

/** The resource types a tag's traffic arrives as: the collector's XHR, a beacon, a pixel, a script. */
export const WIRE_TYPES: `${chrome.webRequest.ResourceType}`[] = ["xmlhttprequest", "ping", "image", "script", "other"];

/** A request as it was heard: which tab and site it came from, where it went, and what it carried. */
export interface Captured {
  tabId: number;
  site: string;
  request: string;
  url: string;
  method: string;
  body?: string;
  /** Epoch ms, from the browser's clock. */
  at: number;
  /** The document the request came from. */
  pageKey: string;
}

/** The body as text, read across every chunk; undefined when there is none, or when it is form data only. */
const bodyOf = (details: chrome.webRequest.OnBeforeRequestDetails): string | undefined => {
  const chunks = details.requestBody?.raw ?? [];
  if (chunks.length === 0) return undefined;
  const decoder = new TextDecoder();
  return chunks.map((chunk) => decoder.decode(chunk.bytes, { stream: true })).join("") + decoder.decode();
};

/** What every kind of request detail says about where a request came from. */
type Origin = Pick<chrome.webRequest.WebRequestDetails, "frameId" | "tabId" | "method" | "documentId" | "initiator">;

/**
 * Only the tab's own page is heard: the top frame of a real tab, and never a CORS preflight. A
 * request names its sender's origin, not the tab's, so an embedded menu on another host sending
 * events of its own would read as the tab having moved to that host.
 */
const ownPage = (details: Origin): boolean =>
  details.frameId === 0 && details.tabId >= 0 && details.method !== "OPTIONS";

const pageKeyOf = (details: Origin): string => details.documentId ?? `origin:${details.initiator ?? ""}`;

/** What a request says about where it came from, or null when it is not the tab's own page speaking. */
export const capturedFrom = (details: chrome.webRequest.OnBeforeRequestDetails): Captured | null => {
  const site = ownPage(details) ? siteOf(details.initiator ?? "") : null;
  return site
    ? {
        tabId: details.tabId,
        site,
        request: details.requestId,
        url: details.url,
        method: details.method,
        body: bodyOf(details),
        at: details.timeStamp,
        pageKey: pageKeyOf(details),
      }
    : null;
};

/** How a request ended, from the browser's word on it. */
export const outcomeOf = (
  details: chrome.webRequest.OnCompletedDetails | chrome.webRequest.OnErrorOccurredDetails,
): Outcome => {
  if ("error" in details) return { kind: "blocked", error: details.error };
  return details.statusCode < 400
    ? { kind: "ok", status: details.statusCode, fromCache: details.fromCache }
    : { kind: "failed", status: details.statusCode };
};

const PENDING: Outcome = { kind: "pending" };

const unique = (values: string[]): string[] => [...new Set(values.filter((value) => value !== ""))];

/** What a captured request said: the events it carried, the tags they named, where they went, and any record event among them. */
export const heard = (
  captured: Captured,
): { events: PendingEvent[]; appIds: string[]; collector: string; records: RecordedTag[] } => {
  const events = decodeCollectorRequest({ url: captured.url, body: captured.body }).map((event, index) => ({
    ...event,
    id: `${captured.request}:${index}`,
    at: captured.at,
    request: captured.request,
    pageKey: captured.pageKey,
    outcome: PENDING,
  }));
  return {
    events,
    appIds: unique(events.map((event) => event.appId)),
    collector: events[0]?.collector ?? "",
    records: events.flatMap((event) => (event.record ? [event.record] : [])),
  };
};
