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

/** Every kind of row the ledger holds. Partner beacons, custom tags and third-party fires arrive with their decoders. */
export type WireEvent = CollectorEvent;

/** An event as it is heard, before the ledger gives it its place. */
export type PendingEvent = Omit<WireEvent, "seq">;

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
