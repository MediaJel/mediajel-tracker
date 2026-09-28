import type { EventKind, ProtocolGroup } from "@mediajel/assistant-core/wire/types";

/**
 * The Snowplow tracker protocol, as the ledger reads it.
 *
 * Reimplemented from the public protocol reference — the keys the JavaScript trackers put on the
 * wire, in the groups the receipt prints them under, with labels written for this panel. The
 * `f_*` browser-feature flags are only sent by the v1 SDK (sp.js); the v2 SDK (cnna.js) carries
 * the same facts in its `browser_context` entity instead.
 */

type Sdk = "both" | "v1" | "v2";

export interface ProtocolEntry {
  label: string;
  group: ProtocolGroup;
  sdk: Sdk;
}

const entry = (group: ProtocolGroup, label: string, sdk: Sdk = "both"): ProtocolEntry => ({ label, group, sdk });

export const PROTOCOL: Record<string, ProtocolEntry> = {
  e: entry("event", "Event type"),
  eid: entry("event", "Event ID"),
  dtm: entry("event", "Created (device clock)"),
  stm: entry("event", "Sent (device clock)"),
  ttm: entry("event", "True timestamp"),

  p: entry("app", "Platform"),
  tna: entry("app", "Tracker name"),
  tv: entry("app", "Tracker version"),
  aid: entry("app", "App ID"),

  duid: entry("user", "Domain user ID"),
  nuid: entry("user", "Network user ID"),
  tnuid: entry("user", "Network user ID"),
  uid: entry("user", "Business user ID"),

  sid: entry("session", "Session ID"),
  vid: entry("session", "Visit number"),

  url: entry("page", "Page URL"),
  page: entry("page", "Page title"),
  refr: entry("page", "Referrer"),
  ds: entry("page", "Document size"),
  cs: entry("page", "Charset"),

  ua: entry("browser", "User agent"),
  lang: entry("browser", "Language"),
  cookie: entry("browser", "Cookies enabled"),
  vp: entry("browser", "Viewport"),
  f_pdf: entry("browser", "PDF plugin", "v1"),
  f_qt: entry("browser", "QuickTime plugin", "v1"),
  f_realp: entry("browser", "RealPlayer plugin", "v1"),
  f_wma: entry("browser", "Windows Media plugin", "v1"),
  f_dir: entry("browser", "Director plugin", "v1"),
  f_fla: entry("browser", "Flash plugin", "v1"),
  f_java: entry("browser", "Java plugin", "v1"),
  f_gears: entry("browser", "Gears plugin", "v1"),
  f_ag: entry("browser", "Silverlight plugin", "v1"),

  tz: entry("device", "Timezone"),
  res: entry("device", "Screen resolution"),
  cd: entry("device", "Colour depth"),

  pp_mix: entry("ping", "Scroll min X"),
  pp_max: entry("ping", "Scroll max X"),
  pp_miy: entry("ping", "Scroll min Y"),
  pp_may: entry("ping", "Scroll max Y"),

  tr_id: entry("transaction", "Order ID"),
  tr_af: entry("transaction", "Affiliation"),
  tr_tt: entry("transaction", "Total"),
  tr_tx: entry("transaction", "Tax"),
  tr_sh: entry("transaction", "Shipping"),
  tr_ci: entry("transaction", "City"),
  tr_st: entry("transaction", "State"),
  tr_co: entry("transaction", "Country"),
  tr_cu: entry("transaction", "Currency"),

  ti_id: entry("item", "Order ID"),
  ti_sk: entry("item", "SKU"),
  ti_nm: entry("item", "Name"),
  ti_na: entry("item", "Name"),
  ti_ca: entry("item", "Category"),
  ti_pr: entry("item", "Price"),
  ti_qu: entry("item", "Quantity"),
  ti_cu: entry("item", "Currency"),

  se_ca: entry("structured", "Category"),
  se_ac: entry("structured", "Action"),
  se_la: entry("structured", "Label"),
  se_pr: entry("structured", "Property"),
  se_va: entry("structured", "Value"),
};

/** The groups in the order the receipt prints them; a group is printed only when one of its keys is present. */
export const GROUP_ORDER: ProtocolGroup[] = [
  "event",
  "app",
  "user",
  "session",
  "page",
  "browser",
  "device",
  "ping",
  "transaction",
  "item",
  "structured",
  "other",
];

export const GROUP_LABELS: Record<ProtocolGroup, string> = {
  event: "Event",
  app: "App",
  user: "User",
  session: "Session",
  page: "Page",
  browser: "Browser",
  device: "Device",
  ping: "Ping",
  transaction: "Transaction",
  item: "Item",
  structured: "Structured event",
  other: "Other",
};

/** What `e` says the event is, and the name a row prints for it. */
export const EVENT_KINDS: Record<string, { kind: EventKind; label: string }> = {
  pv: { kind: "page-view", label: "Page view" },
  pp: { kind: "page-ping", label: "Page ping" },
  ue: { kind: "self-describing", label: "Self-describing event" },
  se: { kind: "structured", label: "Structured event" },
  tr: { kind: "transaction", label: "Transaction" },
  ti: { kind: "transaction-item", label: "Item" },
};

/** The keys the decoder consumes — the self-describing event and the entities — never listed as fields. */
export const CONSUMED = new Set(["ue_pr", "ue_px", "co", "cx"]);

/** The tag's own record event, any 1-0-x revision. */
export const RECORD_SCHEMA_RE = /^iglu:com\.mediajel\.events\/record\/jsonschema\/1-/;

/** The schema a POSTed batch of events declares. */
export const PAYLOAD_DATA_RE = /^iglu:[^/]+\/payload_data\//i;
