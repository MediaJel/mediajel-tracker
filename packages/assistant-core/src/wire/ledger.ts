import type {
  Entity,
  Field,
  LedgerDelta,
  LedgerPage,
  Outcome,
  PendingEvent,
  TabLedger,
  WireEvent,
} from "@mediajel/assistant-core/wire/types";

/**
 * A tab's ledger: the events its page sent, in order, within a budget.
 *
 * A ring buffer with two caps — so many events, so many characters once written as JSON — and
 * per-event caps on the parts that can be arbitrarily large, so one enormous payload never
 * crowds out the page's other events. Every change answers with the ledger after it and the
 * delta a bound panel needs to keep up, and nothing else. Pure, so every rule is a test.
 */

/** How many events one tab keeps, and how many JSON characters they may add up to. */
const EVENT_CAP = 300;
const BYTE_CAP = 400_000;

/** Per-event caps, in characters. The record event's script markup is capped where it is decoded. */
const CAPS = { payload: 6_000, entity: 2_000, field: 512, url: 1_024 };

export const emptyLedger = (site: string): TabLedger => ({
  v: 1,
  site,
  pages: [],
  events: [],
  seq: 0,
  dropped: 0,
  touchedAt: 0,
});

const clipped = (text: string, cap: number): string => (text.length > cap ? `${text.slice(0, cap)}…` : text);

const boundedEntity = (entity: Entity): Entity =>
  entity.data.length > CAPS.entity ? { ...entity, data: entity.data.slice(0, CAPS.entity), truncated: true } : entity;

const boundedField = (field: Field): Field =>
  field.value.length > CAPS.field ? { ...field, value: clipped(field.value, CAPS.field) } : field;

/** An event cut to the caps: its page URL, its payload, every field value, every entity's data. */
const bounded = (event: PendingEvent): PendingEvent => ({
  ...event,
  pageUrl: clipped(event.pageUrl, CAPS.url),
  ...(event.payload === undefined ? {} : { payload: clipped(event.payload, CAPS.payload) }),
  groups: event.groups.map((group) => ({ ...group, fields: group.fields.map(boundedField) })),
  entities: event.entities.map(boundedEntity),
});

const size = (event: WireEvent): number => JSON.stringify(event).length;

/** The oldest events go first until both caps hold. */
const evicted = (events: WireEvent[]): { kept: WireEvent[]; dropped: number } => {
  const sizes = events.map(size);
  let total = sizes.reduce((sum, n) => sum + n, 0);
  let from = 0;
  while (events.length - from > EVENT_CAP || total > BYTE_CAP) {
    total -= sizes[from];
    from += 1;
  }
  return { kept: events.slice(from), dropped: from };
};

/** A page first heard of by an event that could not name its URL takes the URL of the first one that can. */
const relabelled = (pages: LedgerPage[], index: number, url: string): LedgerPage[] =>
  pages[index].url === "" && url !== "" ? pages.map((page, i) => (i === index ? { ...page, url } : page)) : pages;

/** The page an event was heard on, on record. */
const withPage = (pages: LedgerPage[], event: WireEvent): LedgerPage[] => {
  const index = pages.findIndex((page) => page.key === event.pageKey);
  return index === -1
    ? [...pages, { key: event.pageKey, url: event.pageUrl, at: event.at }]
    : relabelled(pages, index, event.pageUrl);
};

/** Only the pages some kept event still refers to. */
const pruned = (pages: LedgerPage[], kept: WireEvent[]): LedgerPage[] => {
  const referenced = new Set(kept.map((event) => event.pageKey));
  return pages.filter((page) => referenced.has(page.key));
};

/** The ledger with these events appended — each given its `seq` and cut to the caps — and the delta that says so. */
export const append = (
  ledger: TabLedger,
  events: PendingEvent[],
  now: number,
): { ledger: TabLedger; delta: LedgerDelta } => {
  const appended = events.map((event, i) => ({ ...bounded(event), seq: ledger.seq + i + 1 }));
  const { kept, dropped } = evicted([...ledger.events, ...appended]);
  const pages = pruned(appended.reduce(withPage, ledger.pages), kept);
  const next: TabLedger = {
    ...ledger,
    pages,
    events: kept,
    seq: ledger.seq + appended.length,
    dropped: ledger.dropped + dropped,
    touchedAt: now,
  };
  return { ledger: next, delta: { appended, settled: [], pages, dropped: next.dropped } };
};

/** The ledger with every pending event of `request` settled — or null when it held none, so nothing is written or pushed. */
export const settle = (
  ledger: TabLedger,
  request: string,
  outcome: Outcome,
  now: number,
): { ledger: TabLedger; delta: LedgerDelta } | null => {
  const pending = ledger.events.filter((event) => event.request === request && event.outcome.kind === "pending");
  if (pending.length === 0) return null;
  const ids = new Set(pending.map((event) => event.id));
  const events = ledger.events.map((event) => (ids.has(event.id) ? { ...event, outcome } : event));
  return {
    ledger: { ...ledger, events, touchedAt: now },
    delta: {
      appended: [],
      settled: pending.map((event) => ({ id: event.id, outcome })),
      pages: ledger.pages,
      dropped: ledger.dropped,
    },
  };
};
