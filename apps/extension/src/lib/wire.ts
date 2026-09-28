import { RecordedTag } from "@mediajel/assistant-core/tags";
import { recogniseCustomTag } from "@mediajel/assistant-core/wire/custom-tags";
import { decodeCollectorRequest, decodeForeignRequest } from "@mediajel/assistant-core/wire/decode";
import { PARTNER_HOSTS, recognisePartner } from "@mediajel/assistant-core/wire/partners";
import { Decoded, Outcome, PendingEvent, WireEvent } from "@mediajel/assistant-core/wire/types";

import { BridgeUp } from "~/bridge/protocol";
import { siteOf } from "~/lib/site";

/**
 * What the wire says, read off `chrome.webRequest` — pure over the details Chrome hands a listener.
 *
 * A MediaJel tag's traffic leaves a page on a handful of hosts: its collector on `*.cnna.io`, the
 * custom-tag files on the same host or the build's own, and the partners its segment parameters
 * point it at — Nexxen, Dstillery and its media6degrees companion, LiquidM, Bing. Each request
 * needs nothing in the page to be heard, and arrives for as long as the tag keeps sending, however
 * it was loaded. A request's body reaches a listener in chunks; every chunk is read, because a
 * batch of events is one document and the app IDs of the last events in it are in the last chunk.
 * Its outcome arrives later, by request id. Every other host carries other vendors' trackers,
 * heard only while a panel is watching the tab.
 */

/** A custom-tag host of the build's own — a staging bucket — is heard as well; the production one is on cnna.io already. */
const customTagHost = (base: string): string[] => {
  try {
    const { hostname } = new URL(base);
    return hostname.endsWith("cnna.io") ? [] : [hostname];
  } catch {
    return [];
  }
};

/** The hosts the narrow listeners are registered for, in Chrome's match-pattern shape. */
const WIRE_HOSTS: string[] = [
  "*.cnna.io",
  ...PARTNER_HOSTS,
  ...customTagHost((process.env.PLASMO_PUBLIC_FRICTIONLESS_CUSTOMTAG_URL ?? "").trim()),
];

/** The URL patterns the narrow listeners are registered for. */
export const WIRE_URLS: string[] = WIRE_HOSTS.map((host) => `*://${host}/*`);

/** The resource types a tag's traffic arrives as: the collector's XHR, a beacon, a pixel, a script. */
export const WIRE_TYPES: `${chrome.webRequest.ResourceType}`[] = ["xmlhttprequest", "ping", "image", "script", "other"];

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
};

/** Whether a host is one a pattern names: `*.x` covers x and every host under it. */
const namedBy = (pattern: string, host: string): boolean =>
  pattern.startsWith("*.") ? host === pattern.slice(2) || host.endsWith(pattern.slice(1)) : host === pattern;

/** Whether a URL is on one of the hosts the narrow listeners hear — so the broad one never hears it twice. */
export const isWireUrl = (url: string): boolean => {
  const host = hostOf(url);
  return WIRE_HOSTS.some((pattern) => namedBy(pattern, host));
};

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

/** The browser's word on how a request ended: answered, sent on to another URL, or never sent. */
export type Ended =
  | chrome.webRequest.OnCompletedDetails
  | chrome.webRequest.OnErrorOccurredDetails
  | chrome.webRequest.OnBeforeRedirectDetails;

/** How a request ended, from the browser's word on it. A redirect answered the request it settles; the next hop is heard as its own. */
export const outcomeOf = (details: Ended): Outcome => {
  if ("error" in details) return { kind: "blocked", error: details.error };
  return details.statusCode < 400
    ? { kind: "ok", status: details.statusCode, fromCache: details.fromCache }
    : { kind: "failed", status: details.statusCode };
};

const PENDING: Outcome = { kind: "pending" };

const unique = (values: string[]): string[] => [...new Set(values.filter((value) => value !== ""))];

type Row = Decoded<WireEvent>;

/** On one of our hosts: a partner's signal, a custom-tag fetch, or the collector's events. */
const ours = (captured: Captured): Row[] => {
  const partner = recognisePartner(captured.url);
  if (partner) return [partner];
  const custom = recogniseCustomTag(captured.url);
  return custom ? [custom] : decodeCollectorRequest(captured);
};

/** Every row a captured request amounts to; anywhere but our hosts, another vendor's tracker or nothing. */
const rowsOf = (captured: Captured): Row[] =>
  isWireUrl(captured.url) ? ours(captured) : decodeForeignRequest(captured);

/**
 * A row placed: where and when it was heard, and an id no other row shares. The browser hears a
 * redirected request again under the same request id, milliseconds later, so the moment is part
 * of the id and the hops are two rows.
 */
const placed = (row: Row, captured: Captured, index: number): PendingEvent => ({
  ...row,
  id: `${captured.request}:${index}:${captured.at}`,
  at: captured.at,
  request: captured.request,
  pageKey: captured.pageKey,
  outcome: PENDING,
});

type Collector = Extract<PendingEvent, { source: "collector" }>;

const isCollector = (event: PendingEvent): event is Collector => event.source === "collector";

/** What a captured request said. */
export interface Heard {
  /** Every row it amounts to, pending and placed. */
  events: PendingEvent[];
  /** The tags the collector events among them named, once each. */
  appIds: string[];
  /** Where the collector events went; "" when there were none. */
  collector: string;
  /** Any record event among them. */
  records: RecordedTag[];
}

export const heard = (captured: Captured): Heard => {
  const events = rowsOf(captured).map((row, index) => placed(row, captured, index));
  const collectors = events.filter(isCollector);
  return {
    events,
    appIds: unique(collectors.map((event) => event.appId)),
    collector: collectors[0]?.collector ?? "",
    records: collectors.flatMap((event) => (event.record ? [event.record] : [])),
  };
};

/** The third-party messages a page's bridge sends that become rows. */
export type ThirdPartyUp = Extract<BridgeUp, { type: "third-party-registered" | "third-party-fired" }>;

/** A registration is not a request; it is on record the moment it is made. */
const MADE: Outcome = { kind: "ok", status: 0, fromCache: false };

/** What the page's bridge reported about a third-party tag, placed on the document it came from. */
export const heardFromBridge = (message: ThirdPartyUp, pageKey: string, at: number): PendingEvent => {
  const base = { id: message.key, at, request: message.key, pageKey, pageUrl: message.pageUrl, appId: "" };
  return message.type === "third-party-registered"
    ? { ...base, outcome: MADE, source: "third-party", phase: "registered", triggers: message.triggers }
    : {
        ...base,
        outcome: PENDING,
        source: "third-party",
        phase: "fired",
        trigger: message.trigger,
        element: message.element,
        host: message.host,
        url: message.url,
      };
};
