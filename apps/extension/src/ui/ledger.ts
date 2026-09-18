import { RecordedTag, TagRecord } from "@mediajel/assistant-core/tags";
import { EVENT_KINDS } from "@mediajel/assistant-core/wire/protocol";
import {
  CollectorEvent,
  CustomTagFetch,
  ForeignEvent,
  PartnerSignal,
  ThirdPartyFire,
  ThirdPartyRegistration,
  ThirdPartyTriggerName,
  Outcome,
  WireEvent,
} from "@mediajel/assistant-core/wire/types";

import { shortAppId } from "~/ui/activity";

/**
 * How the ledger says an event: its family, its plain name, who it belongs to, the one or two
 * facts worth a second line, the status word, and the clock. Pure, so every row the Events view
 * draws is a row a test has read first.
 */

export type Family = "collector" | "partner" | "custom" | "foreign";

export interface Row {
  id: string;
  family: Family;
  name: string;
  /** The tag or partner the event belongs to, in soft ink. */
  who: string;
  /** What is worth a second line: an order id and total, a schema name, an item's sku and name. */
  facts: string;
  /** A word only when something went wrong or is still in flight; "" when the request landed. */
  status: string;
  problem: boolean;
  clock: string;
  at: number;
}

const CLOCK = new Intl.DateTimeFormat("en-US", {
  hour12: false,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

/** "03:19:50" — the clock beside a row, in the browser's own zone. */
export const clock = (at: number): string => CLOCK.format(at);

/** A page's count as its band prints it: two digits at least, the way a ledger numbers its pages. */
export const padCount = (n: number): string => String(n).padStart(2, "0");

const STATUS: Record<Outcome["kind"], (outcome: Outcome) => string> = {
  pending: () => "sending…",
  ok: () => "",
  failed: (outcome) => `failed (${(outcome as { status: number }).status})`,
  blocked: () => "blocked",
};

const PROBLEMS = new Set<Outcome["kind"]>(["failed", "blocked"]);

/** The status as a word, never a colour alone. */
const statusWord = (outcome: Outcome): string => STATUS[outcome.kind](outcome);

/** "record/1-0-2" — an Iglu URI's name and version, the way a schema is spoken of. */
export const schemaShort = (schema: string): string => {
  const parts = schema.replace(/^iglu:/, "").split("/");
  return parts.length >= 4 ? `${parts[1]}/${parts[3]}` : schema;
};

const fieldsOf = (event: CollectorEvent): Map<string, string> =>
  new Map(event.groups.flatMap((group) => group.fields.map((field) => [field.key, field.value])));

/** A transaction's order id and total; an item's sku and name. */
const transactionFacts = (event: CollectorEvent): string => {
  const fields = fieldsOf(event);
  const facts = [
    fields.get("tr_id") ?? fields.get("ti_sk"),
    fields.get("tr_tt") ?? fields.get("ti_nm") ?? fields.get("ti_na"),
  ];
  return facts.filter(Boolean).join(" · ");
};

type Bones = Omit<Row, "id" | "status" | "problem" | "clock" | "at">;

const collectorRow = (event: CollectorEvent): Bones => ({
  family: "collector",
  name: event.name,
  who: shortAppId(event.appId) || "tag unknown",
  facts: event.schema ? schemaShort(event.schema) : transactionFacts(event),
});

const PARTNERS: Record<string, string> = {
  nexxen: "Nexxen",
  dstillery: "Dstillery",
  liquidm: "LiquidM",
  bing: "Bing Ads",
};
const PURPOSES: Record<string, string> = {
  audience: "page-view beacon",
  conversion: "transaction beacon",
  sync: "segment sync",
  loader: "page load",
};

/** A partner's own name and what the request was for. */
export const partnerName = (partner: string, purpose: string): string =>
  `${PARTNERS[partner] ?? partner} · ${PURPOSES[purpose] ?? purpose}`;

const partnerFacts = (event: PartnerSignal): string => {
  if (event.unconfigured) return "not configured (tag default)";
  return event.order ? `${event.order.id} · ${event.order.amount}` : "";
};

const partnerRow = (event: PartnerSignal): Bones => ({
  family: "partner",
  name: partnerName(event.partner, event.purpose),
  who: event.appId ? shortAppId(event.appId) : "tag unknown",
  facts: partnerFacts(event),
});

const customRow = (event: CustomTagFetch): Bones => ({
  family: "custom",
  name: `Custom tag · ${event.name}`,
  who: event.scope === "domain" ? "domain file" : "app-id file",
  facts: "",
});

/** The moments a third-party tag fires at, in words. */
export const TRIGGERS: Record<ThirdPartyTriggerName, string> = {
  onTransaction: "transaction",
  onAddToCart: "add to cart",
  onRemoveFromCart: "remove from cart",
  onSignup: "sign-up",
};

const registeredRow = (event: ThirdPartyRegistration): Bones => ({
  family: "custom",
  name: "Third-party tags registered",
  who: `${event.triggers.reduce((sum, trigger) => sum + trigger.count, 0)} tags`,
  facts: event.triggers.map((trigger) => TRIGGERS[trigger.trigger]).join(" · "),
});

const firedRow = (event: ThirdPartyFire): Bones => ({
  family: "custom",
  name: `Third-party tag · ${event.host}`,
  who: TRIGGERS[event.trigger],
  facts: event.element,
});

const thirdPartyRow = (event: ThirdPartyRegistration | ThirdPartyFire): Bones =>
  event.phase === "fired" ? firedRow(event) : registeredRow(event);

const foreignRow = (event: ForeignEvent): Bones => ({
  family: "foreign",
  name: `${event.collector} · ${EVENT_KINDS[event.code]?.label ?? event.code}`,
  who: event.tracker,
  facts: event.version,
});

const ROWS: { [K in WireEvent["source"]]: (event: Extract<WireEvent, { source: K }>) => Bones } = {
  collector: collectorRow,
  partner: partnerRow,
  "custom-tag": customRow,
  "third-party": thirdPartyRow,
  foreign: foreignRow,
};

/** One event as its row. */
export const rowOf = (event: WireEvent): Row => ({
  ...(ROWS[event.source] as (event: WireEvent) => Bones)(event),
  id: event.id,
  status: statusWord(event.outcome),
  problem: PROBLEMS.has(event.outcome.kind),
  clock: clock(event.at),
  at: event.at,
});

/** Whether a row answers a filter typed in the search box. */
export const matches = (row: Row, query: string): boolean => {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [row.name, row.who, row.facts].some((text) => text.toLowerCase().includes(needle));
};

/** A value's type as the chip names it. */
export const typeOf = (value: unknown): string => {
  if (value === null) return "null";
  return Array.isArray(value) ? "array" : typeof value;
};

/** The page a band is headed with: the host at the root, else the path; the host under it when off-site. */
export const pageLabel = (url: string, site: string): { path: string; host: string } => {
  try {
    const parsed = new URL(url);
    const root = parsed.pathname === "/";
    return {
      path: root ? `${parsed.hostname}/` : `${parsed.pathname}${parsed.search}`,
      host: !root && parsed.hostname !== site ? parsed.hostname : "",
    };
  } catch {
    return { path: url || "Unknown page", host: "" };
  }
};

/** The tag a record event describes, as a record the configuration slip can print. */
export const recordAsTag = (record: RecordedTag): TagRecord => ({
  appId: record.appId,
  state: "sending",
  environment: record.environment,
  version: record.version,
  event: record.event,
  announced: false,
  firstSeenAt: 0,
  collector: record.collector,
  enabled: record.config.params.enable !== "false",
  config: record.config,
  lastHeardAt: null,
});
