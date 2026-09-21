import { Storage } from "@plasmohq/storage";

import { append, emptyLedger, settle } from "@mediajel/assistant-core/wire/ledger";
import { LedgerDelta, Outcome, PendingEvent, TabLedger } from "@mediajel/assistant-core/wire/types";

/**
 * The one owner of each tab's ledger: the events its page was heard sending.
 *
 * Kept in session storage, like the tab's tags, because the service worker is stopped after
 * thirty seconds of quiet and events heard while no panel was open must still be there when
 * one opens. Mirrored in memory so a page ping does not read the whole ledger back from storage
 * to append one row; the mirror refills from storage on the first touch after a restart. One
 * write chain per tab, so two requests landing together cannot overwrite each other.
 *
 * The chronology lives here; the current truth about each tag — including what its record event
 * said — lives in `tag-state.ts`, fed by the same capture.
 */

const area = new Storage({ area: "session" });

const keyOf = (tabId: number): string => `events/${tabId}`;

/** The tabs with a ledger, most recently touched first, so the oldest can be let go. */
const INDEX_KEY = "events/index";
const TAB_CAP = 12;

const mirror = new Map<number, TabLedger>();

/** One write per tab at a time. */
const writes = new Map<number, Promise<unknown>>();

const chained = <T>(tabId: number, work: () => Promise<T>): Promise<T> => {
  const next = (writes.get(tabId) ?? Promise.resolve()).then(work);
  writes.set(
    tabId,
    next.catch(() => undefined),
  );
  return next;
};

const load = async (tabId: number): Promise<TabLedger | null> => {
  const held = mirror.get(tabId) ?? (await area.get<TabLedger>(keyOf(tabId))) ?? null;
  if (held) mirror.set(tabId, held);
  return held;
};

const drop = async (tabId: number): Promise<void> => {
  mirror.delete(tabId);
  await area.remove(keyOf(tabId));
};

/** Moves a tab to the front of the index and lets go of the ledgers of the tabs that fall off its end. */
const touched = async (tabId: number): Promise<void> => {
  const index = (await area.get<number[]>(INDEX_KEY)) ?? [];
  const next = [tabId, ...index.filter((id) => id !== tabId)];
  await Promise.all(next.slice(TAB_CAP).map(drop));
  await area.set(INDEX_KEY, next.slice(0, TAB_CAP));
};

const store = async (tabId: number, ledger: TabLedger): Promise<void> => {
  mirror.set(tabId, ledger);
  await area.set(keyOf(tabId), ledger);
  await touched(tabId);
};

/** The ledger a change starts from: the tab's, or a fresh one when the tab has moved to another site. */
const standing = (held: TabLedger | null, site: string): TabLedger =>
  held !== null && held.site === site ? held : emptyLedger(site);

/** Appends the events a tab's page sent. Resolves to the delta when there was something to append, else null. */
export const recordEvents = (tabId: number, site: string, events: PendingEvent[]): Promise<LedgerDelta | null> =>
  chained(tabId, async () => {
    if (events.length === 0) return null;
    const next = append(standing(await load(tabId), site), events, Date.now());
    await store(tabId, next.ledger);
    return next.delta;
  });

/** Settles a request's events with how it ended. Resolves to the delta and the ledger's site when any were pending, else null. */
export const settleEvents = (
  tabId: number,
  request: string,
  outcome: Outcome,
): Promise<{ site: string; delta: LedgerDelta } | null> =>
  chained(tabId, async () => {
    const held = await load(tabId);
    const next = held && settle(held, request, outcome, Date.now());
    if (!next) return null;
    await store(tabId, next.ledger);
    return { site: next.ledger.site, delta: next.delta };
  });

/** The tab's ledger — empty when the tab has moved to another site. */
export const readLedger = async (tabId: number, site: string): Promise<TabLedger> => standing(await load(tabId), site);

/** Lets the events go and keeps counting: the sequence continues, so a panel that saw the old rows is not confused by new ones. */
export const clearLedger = (tabId: number, site: string): Promise<void> =>
  chained(tabId, async () => {
    const held = standing(await load(tabId), site);
    await store(tabId, { ...emptyLedger(site), seq: held.seq });
  });

/** The tab is gone, and so is its ledger. */
export const forgetLedger = async (tabId: number): Promise<void> => {
  await drop(tabId);
  const index = (await area.get<number[]>(INDEX_KEY)) ?? [];
  await area.set(
    INDEX_KEY,
    index.filter((id) => id !== tabId),
  );
};
