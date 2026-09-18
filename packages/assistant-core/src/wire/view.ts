import type { TagRecord } from "@mediajel/assistant-core/tags";
import { attributePartner } from "@mediajel/assistant-core/wire/partners";
import type { LedgerDelta, LedgerPage, LedgerView, TabLedger, WireEvent } from "@mediajel/assistant-core/wire/types";

/**
 * The ledger as the panel reads it. The ledger keeps its events oldest first, the order they
 * were appended in; the panel reads newest first, the order an operator watches a page in.
 */
export const viewOf = (ledger: TabLedger): LedgerView => ({
  site: ledger.site,
  events: [...ledger.events].reverse(),
  pages: [...ledger.pages].reverse(),
  dropped: ledger.dropped,
  seq: ledger.seq,
});

/** Pages by key, an incoming page replacing what was held for the same document. */
const mergePages = (current: LedgerPage[], incoming: LedgerPage[]): LedgerPage[] => {
  const byKey = new Map(current.map((page) => [page.key, page]));
  for (const page of incoming) byKey.set(page.key, page);
  return [...byKey.values()];
};

/** Every event a settle names, with how its request ended; a settle for a row not held is nothing. */
const withOutcomes = (events: WireEvent[], settled: LedgerDelta["settled"]): WireEvent[] => {
  const outcomes = new Map(settled.map((entry) => [entry.id, entry.outcome]));
  return events.map((event) => {
    const outcome = outcomes.get(event.id);
    return outcome ? { ...event, outcome } : event;
  });
};

/**
 * A push applied to what the panel holds: the new rows on top, settles by id, and any row the
 * panel already has — a push that arrived twice, or before the read that carried it — ignored.
 */
export const applyDelta = (view: LedgerView, delta: LedgerDelta): LedgerView => {
  const fresh = delta.appended.filter((event) => event.seq > view.seq).sort((a, b) => b.seq - a.seq);
  return {
    ...view,
    events: withOutcomes([...fresh, ...view.events], delta.settled),
    pages: mergePages(view.pages, delta.pages),
    dropped: delta.dropped,
    seq: Math.max(view.seq, ...fresh.map((event) => event.seq)),
  };
};

/** A read merged over what the panel holds: union by id, newest first — a push that raced the read is kept. */
export const mergeRead = (current: LedgerView, read: LedgerView): LedgerView => {
  const byId = new Map(read.events.map((event) => [event.id, event]));
  for (const event of current.events) if (!byId.has(event.id)) byId.set(event.id, event);
  return {
    ...read,
    events: [...byId.values()].sort((a, b) => b.seq - a.seq),
    pages: mergePages(read.pages, current.pages),
    seq: Math.max(read.seq, current.seq),
  };
};

interface PageGroup {
  page: LedgerPage;
  events: WireEvent[];
}

/** The events under the page that made them, newest page first, rows newest first within it. */
export const byPage = (view: LedgerView): PageGroup[] => {
  const groups = new Map<string, WireEvent[]>();
  for (const event of view.events) groups.set(event.pageKey, [...(groups.get(event.pageKey) ?? []), event]);
  const pages = new Map(view.pages.map((page) => [page.key, page]));
  return [...groups.entries()]
    .map(([key, events]) => ({ page: pages.get(key) ?? { key, url: events[0].pageUrl, at: events[0].at }, events }))
    .sort((a, b) => b.events[0].seq - a.events[0].seq);
};

/** Every partner signal with the tag it belongs to, from the tags known now. */
export const attributed = (events: WireEvent[], tags: TagRecord[]): WireEvent[] =>
  events.map((event) =>
    event.source === "partner" && !event.appId ? { ...event, appId: attributePartner(event, tags).appId } : event,
  );
