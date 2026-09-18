import type { RecordedTag } from "@mediajel/assistant-core/tags";

/**
 * What a tab's page sends, as the ledger keeps it.
 *
 * One event per row: decoded from the request the tag made, attributed to the app ID the wire
 * named, and settled with the outcome the browser reported. Nothing here is validated against a
 * schema and nothing is fetched to read it — the ledger says what the tab's own traffic said,
 * in this browser, and none of it leaves.
 */

/** How a request ended: still in flight, answered, refused by the server, or never sent. */
export type Outcome =
  | { kind: "pending" }
  | { kind: "ok"; status: number; fromCache: boolean }
  | { kind: "failed"; status: number }
  | { kind: "blocked"; error: string };

/** A self-describing JSON: a schema URI and the data it describes. */
export interface SelfDescribing {
  schema: string;
  data: unknown;
}

export interface WireBase {
  id: string;
  /** Monotonic per tab, assigned when the ledger appends the event. */
  seq: number;
  /** Epoch ms, from the browser's clock for the request. */
  at: number;
  /** The browser's request id, so the outcome can find the events it settles. */
  request: string;
  /** The document the request came from — its id, or `origin:<initiator>` when the browser gave none. */
  pageKey: string;
  /** The page's URL as the event named it; "" when the wire did not say. */
  pageUrl: string;
  /** "" when the wire did not say. */
  appId: string;
  outcome: Outcome;
}

export type Transport = "post" | "get";

export type EventKind =
  | "page-view"
  | "page-ping"
  | "self-describing"
  | "structured"
  | "transaction"
  | "transaction-item"
  | "unknown";

export type ProtocolGroup =
  | "event"
  | "app"
  | "user"
  | "session"
  | "page"
  | "browser"
  | "device"
  | "ping"
  | "transaction"
  | "item"
  | "structured"
  | "other";

export interface Field {
  key: string;
  label: string;
  value: string;
}

export interface FieldGroup {
  group: ProtocolGroup;
  label: string;
  fields: Field[];
}

/** One entity attached to an event, its data kept as JSON text. */
export interface Entity {
  schema: string;
  vendor: string;
  name: string;
  version: string;
  data: string;
  truncated: boolean;
}

export interface CollectorEvent extends WireBase {
  source: "collector";
  transport: Transport;
  /** Host only. */
  collector: string;
  kind: EventKind;
  /** The raw `e` the tracker sent. */
  code: string;
  /** "Page view", or a self-describing event's own name — "record", "sign_up", "link_click". */
  name: string;
  /** A self-describing event's inner schema. */
  schema?: string;
  /** A self-describing event's data as JSON text, bounded; a sign-up's masked. */
  payload?: string;
  groups: FieldGroup[];
  entities: Entity[];
  /** Where the event sat in the request that carried it. */
  batch: { index: number; size: number };
  /** The tag's configuration, when this is the tag's own record event. */
  record?: RecordedTag;
}

/** The partners the tag fires pixels at from its segment parameters, and the one whose loader it installs. */
export type Partner = "nexxen" | "dstillery" | "liquidm" | "bing";

/**
 * What a partner request is for: an audience pixel on a page view, a conversion pixel on a
 * purchase, a cookie sync, or the partner's own loader script.
 */
export type PartnerPurpose = "audience" | "conversion" | "sync" | "loader";

/** A request to a partner, heard on the partner's own host and decoded from the tag's template for it. */
export interface PartnerSignal extends WireBase {
  source: "partner";
  partner: Partner;
  purpose: PartnerPurpose;
  /** The segment as sent — `b2`, `nc`, `seg` or `ti`; "" for a loader. */
  segment: string;
  /** A Dstillery `nc` of 00000: the tag's own default when the page configured no segment. */
  unconfigured: boolean;
  /** The same pixel on the partner's companion host — media6degrees for Dstillery. */
  companion: boolean;
  /** A conversion's order, as the pixel carried it. */
  order?: { id: string; amount: string };
  /** The request's URL, its query values masked, bounded. */
  url: string;
}

/** Which of the tag's custom-tag files a fetch loads: the domain's, or the app ID's. */
export type CustomTagScope = "domain" | "app-id";

/** A fetch of one of the tag's custom-tag files, named for what it loads. */
export interface CustomTagFetch extends WireBase {
  source: "custom-tag";
  scope: CustomTagScope;
  /** Decoded from the file's name: the hostname, or the app ID. */
  name: string;
  url: string;
}

/** The moments a third-party tag can be registered for: the keys of the tag's `registerThirdPartyTags` input. */
export type ThirdPartyTriggerName = "onTransaction" | "onAddToCart" | "onRemoveFromCart" | "onSignup";

/** What was registered for one trigger — how many tags, and the hosts they go to; never the templates. */
export interface ThirdPartyTrigger {
  trigger: ThirdPartyTriggerName;
  count: number;
  hosts: string[];
}

/** The element a third-party tag fires as, in the tag's own words. */
export type ThirdPartyElement = "image" | "script";

/** The page registered third-party tags with the tag. */
export interface ThirdPartyRegistration extends WireBase {
  source: "third-party";
  phase: "registered";
  triggers: ThirdPartyTrigger[];
}

/** The tag fired one of the registered third-party tags. */
export interface ThirdPartyFire extends WireBase {
  source: "third-party";
  phase: "fired";
  trigger: ThirdPartyTriggerName;
  element: ThirdPartyElement;
  host: string;
  /** The element's URL, its query values masked, bounded. */
  url: string;
}

/** Another vendor's Snowplow tracker on the page: enough to say it is there and what it sent, nothing of its payload. */
export interface ForeignEvent extends WireBase {
  source: "foreign";
  /** Host only. */
  collector: string;
  kind: EventKind;
  /** The raw `e` the tracker sent. */
  code: string;
  /** The tracker's name (`tna`). */
  tracker: string;
  /** The tracker's version (`tv`). */
  version: string;
}

/** Every kind of row the ledger holds. */
export type WireEvent =
  | CollectorEvent
  | PartnerSignal
  | CustomTagFetch
  | ThirdPartyRegistration
  | ThirdPartyFire
  | ForeignEvent;

/** `Omit` applied to each member of a union, so every kind of row keeps its own fields. */
type Each<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An event as it is heard, before the ledger gives it its place. */
export type PendingEvent = Each<WireEvent, "seq">;

/** An event as its decoder reads it: everything but where and when it was heard, and how it ended. */
export type Decoded<T extends WireEvent> = Each<T, "id" | "seq" | "at" | "request" | "pageKey" | "outcome">;

export interface LedgerPage {
  key: string;
  /** "" until an event names it. */
  url: string;
  at: number;
}

export interface TabLedger {
  v: 1;
  site: string;
  pages: LedgerPage[];
  /** Oldest first. */
  events: WireEvent[];
  /** The last `seq` handed out. */
  seq: number;
  /** How many events were let go to stay within the caps. */
  dropped: number;
  touchedAt: number;
}

/** What one change to a ledger amounts to — all a bound panel needs to keep up. */
export interface LedgerDelta {
  appended: WireEvent[];
  settled: { id: string; outcome: Outcome }[];
  /** Every page on record after the change. */
  pages: LedgerPage[];
  /** The ledger's count after the change. */
  dropped: number;
}

/** The ledger as the panel reads it: newest first. */
export interface LedgerView {
  site: string;
  events: WireEvent[];
  pages: LedgerPage[];
  dropped: number;
  seq: number;
}
