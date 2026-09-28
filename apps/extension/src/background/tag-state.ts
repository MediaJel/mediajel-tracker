import { Storage } from "@plasmohq/storage";

import { Evidence, TabTags, merge, nothingKnown } from "@mediajel/assistant-core/tags";

/**
 * The one owner of what is known about each tab's tags.
 *
 * Every source — the page's Snowplow queue, the scripts read out of the page, beacons on the wire,
 * the tag announcing itself — reports here, and the panel reads from here, so no source's timing
 * decides what the operator sees. Kept in session storage rather than in memory: the service
 * worker is stopped after thirty seconds of quiet, and a tag heard a minute before the panel opened
 * must not have been forgotten.
 */

const area = new Storage({ area: "session" });

const keyOf = (tabId: number): string => `tags/${tabId}`;

/** What is known about this tab's page — nothing, when the tab has moved to another site. */
export const tagsOfTab = async (tabId: number, site: string): Promise<TabTags> => {
  const tab = await area.get<TabTags>(keyOf(tabId));
  return tab?.site === site ? tab : nothingKnown(site);
};

/** One write per tab at a time, so two pieces of evidence landing together cannot overwrite each other. */
const writes = new Map<number, Promise<unknown>>();

/**
 * Records a piece of evidence about a tab's page. Resolves to what is known afterwards when the
 * evidence changed something, or null when it was already known — so only news is pushed.
 */
export const learn = (tabId: number, site: string, evidence: Evidence): Promise<TabTags | null> => {
  const next = (writes.get(tabId) ?? Promise.resolve()).then(async () => {
    const current = (await area.get<TabTags>(keyOf(tabId))) ?? null;
    const merged = merge(current, site, evidence, Date.now());
    if (merged) await area.set(keyOf(tabId), merged);
    return merged;
  });
  writes.set(
    tabId,
    next.catch(() => undefined),
  );
  return next;
};

export const forgetTab = async (tabId: number): Promise<void> => {
  await area.remove(keyOf(tabId));
};
