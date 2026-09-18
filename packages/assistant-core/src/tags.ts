import { TagSummary } from "@mediajel/assistant-core/context";

/**
 * What is known about the MediaJel tags on one tab's page, and how each new piece of evidence
 * changes it.
 *
 * Evidence arrives from several places at different times — the page's Snowplow queue naming the
 * trackers it holds, the script elements read out of the page, a beacon heard on the wire, the tag
 * announcing itself — and none of them sees the whole picture. This module is the one place they
 * meet: a pure merge that never reorders rows, never forgets a tag, and never lets a state slide
 * backwards, plus the status the rest of the product derives from it. Pure, so every rule is a test.
 */

export type TagState = "installed" | "held-back" | "running" | "sending" | "opted-out" | "disabled" | "failed";

export interface TagRecord {
  appId: string;
  state: TagState;
  environment: string;
  version: string;
  event: string;
  /** Whether the tag itself said so, rather than the page or the wire. */
  announced: boolean;
  error?: string;
  firstSeenAt: number;
}

export interface PageFacts {
  trackTransPresent: boolean;
  optedOut: boolean;
}

/**
 * What the operator needs to know about the tag on THIS page before trusting a recording: whether
 * `trackTrans` exists at all, and the configurations that silently disable it. A reading of a
 * tab's record (`trackerStatus`), never a scan of its own.
 */
export interface TrackerStatus {
  /** The first tag's app ID — the one Deploy offers an app-id file for. */
  appId: string;
  environment: string;
  version: string;
  /** The tag URL's `event` param. `impression`/`signup` make trackTrans a silent no-op. */
  event: string;
  collector: string;
  /** Whether a MediaJel tag was found on the page at all. */
  tagPresent: boolean;
  /** Every MediaJel tag known on the page, in the order first seen. */
  tags: TagRecord[];
  trackTransPresent: boolean;
  /** GPC/DNT stopped the tag before it initialised anything. */
  optedOut: boolean;
  /** Human-readable reasons the recording may not translate into working tracking. */
  warnings: string[];
}

export interface TabTags {
  site: string;
  /** Whether the page has had its moment to load a tag; "no tag" means nothing before this. */
  settled: boolean;
  facts: PageFacts | null;
  /** In the order first seen — sources arriving later fill rows in, they never move them. */
  tags: TagRecord[];
}

/** What a tag announces about itself; the shape tracker-core's `announce` dispatches. */
export interface AnnouncedTag {
  appId: string;
  environment?: string;
  version?: string;
  event?: string;
  state?: string;
  error?: string;
}

export type Evidence =
  /** A new document in the tab, or a bridge attached to one. */
  | { kind: "document" }
  | { kind: "announced"; tag: AnnouncedTag }
  /** The page's Snowplow queue named these trackers. */
  | { kind: "running"; appIds: string[] }
  /** The tag scripts read out of the page. */
  | { kind: "scripts"; tags: TagSummary[] }
  | { kind: "beacon"; appIds: string[] }
  | { kind: "facts"; facts: PageFacts }
  | { kind: "settled" };

/** A state never moves to a lower rank; rank 0 states may replace each other as the page changes. */
const RANK: Record<TagState, number> = {
  installed: 0,
  "held-back": 0,
  "opted-out": 1,
  disabled: 1,
  failed: 1,
  running: 2,
  sending: 3,
};

const ANNOUNCED_STATES: Record<string, TagState> = {
  installed: "installed",
  running: "running",
  "opted-out": "opted-out",
  disabled: "disabled",
  failed: "failed",
};

const empty = (site: string): TabTags => ({ site, settled: false, facts: null, tags: [] });

const raise = (record: TagRecord, state: TagState): TagRecord => {
  const higher = RANK[state] > RANK[record.state];
  const sideways = RANK[state] === 0 && RANK[record.state] === 0 && state !== record.state;
  return higher || sideways ? { ...record, state } : record;
};

type Change = (record: TagRecord) => TagRecord;

/** Applies a change to one tag's record, adding the record first when the tag is new. */
const upsert = (tags: TagRecord[], appId: string, now: number, change: Change): TagRecord[] => {
  const index = tags.findIndex((record) => record.appId === appId);
  if (index === -1) {
    const fresh: TagRecord = {
      appId,
      state: "installed",
      environment: "",
      version: "",
      event: "",
      announced: false,
      firstSeenAt: now,
    };
    return [...tags, change(fresh)];
  }
  const next = change(tags[index]);
  return next === tags[index] ? tags : tags.map((record, i) => (i === index ? next : record));
};

const announced = (tags: TagRecord[], tag: AnnouncedTag, now: number): TagRecord[] =>
  upsert(tags, tag.appId, now, (record) => ({
    ...raise(record, ANNOUNCED_STATES[tag.state ?? ""] ?? "installed"),
    environment: tag.environment || record.environment,
    version: tag.version || record.version,
    event: tag.event ?? record.event,
    ...(tag.error === undefined ? {} : { error: tag.error }),
    announced: true,
  }));

const raised = (tags: TagRecord[], appIds: string[], state: TagState, now: number): TagRecord[] =>
  appIds.reduce((acc, appId) => upsert(acc, appId, now, (record) => raise(record, state)), tags);

/** A script names a tag that may not have run; it fills what is empty and only ever moves a rank-0 state. */
const fromScript = (record: TagRecord, script: TagSummary): TagRecord => {
  const filled = {
    ...record,
    environment: record.environment || script.environment,
    version: record.version || script.version,
  };
  return RANK[record.state] === 0 ? raise(filled, script.delayed ? "held-back" : "installed") : filled;
};

const scripts = (tags: TagRecord[], found: TagSummary[], now: number): TagRecord[] =>
  found.reduce((acc, script) => upsert(acc, script.appId, now, (record) => fromScript(record, script)), tags);

/** A browser that opted out stops every tag that has not said otherwise for itself. */
const withFacts = (tab: TabTags, facts: PageFacts): TabTags => ({
  ...tab,
  facts,
  tags: facts.optedOut
    ? tab.tags.map((record) =>
        !record.announced && RANK[record.state] === 0 ? { ...record, state: "opted-out" } : record,
      )
    : tab.tags,
});

const apply = (tab: TabTags, evidence: Evidence, now: number): TabTags => {
  switch (evidence.kind) {
    case "document":
      return { ...tab, settled: false, facts: null };
    case "announced":
      return { ...tab, tags: announced(tab.tags, evidence.tag, now) };
    case "running":
      return { ...tab, tags: raised(tab.tags, evidence.appIds, "running", now) };
    case "scripts":
      return { ...tab, tags: scripts(tab.tags, evidence.tags, now) };
    case "beacon":
      return { ...tab, tags: raised(tab.tags, evidence.appIds, "sending", now) };
    case "facts":
      return withFacts(tab, evidence.facts);
    case "settled":
      return { ...tab, settled: true };
  }
};

const same = (a: TabTags, b: TabTags): boolean => a.settled === b.settled && a.facts === b.facts && a.tags === b.tags;

/**
 * What is known after this evidence — or null when it changed nothing, so nothing is written or
 * pushed. A tab that has moved to another site starts over: its records described somebody else's page.
 */
export const merge = (current: TabTags | null, site: string, evidence: Evidence, now: number): TabTags | null => {
  const before = current && current.site === site ? current : empty(site);
  const after = apply(before, evidence, now);
  return before === current && same(before, after) ? null : after;
};

const IDLE_EVENTS = new Set(["impression", "signup"]);

const startWarnings = (tab: TabTags, optedOut: boolean): string[] => {
  if (tab.tags.some((tag) => tag.state === "held-back")) {
    return [
      "The MediaJel tag on this page is held back by a page-speed plugin and hasn't run yet. Scroll or click the page to release it; Verify needs it running.",
    ];
  }
  if (optedOut)
    return ["This browser sends GPC/DNT, so the tag did not initialise here. Recording and Verify still work."];
  const started = tab.tags.some((tag) => tag.state === "running" || tag.state === "sending");
  if (tab.tags.length > 0 && !started && !tab.facts?.trackTransPresent) {
    return ["The tag on this page is installed but hasn't finished starting. Verify needs it running."];
  }
  return [];
};

const tagWarnings = (tags: TagRecord[]): string[] =>
  tags.flatMap((tag) => {
    if (tag.state === "disabled") return ["This tag is disabled (enable=false)."];
    if (tag.state === "failed") return [`The tag on this page failed to start: ${tag.error ?? "unknown error"}.`];
    return [];
  });

const warningsFor = (tab: TabTags, optedOut: boolean): string[] => {
  if (tab.tags.length === 0) {
    return tab.settled
      ? [
          "No MediaJel tag has spoken up on this page. You can still record and generate; Verify needs the tag, so load it first.",
        ]
      : [];
  }
  const event = tab.tags[0].event;
  const eventWarning = IDLE_EVENTS.has(event)
    ? [`This tag runs with event=${event}, so window.trackTrans is a silent no-op on this page.`]
    : [];
  return [...startWarnings(tab, optedOut), ...tagWarnings(tab.tags), ...eventWarning];
};

/** The status the Record step and the prompt read: the first tag's configuration, and what to warn about. */
export const trackerStatus = (tab: TabTags): TrackerStatus => {
  const [first] = tab.tags;
  const optedOut = tab.facts?.optedOut === true || tab.tags.some((tag) => tag.state === "opted-out");
  return {
    appId: first?.appId ?? "",
    environment: first?.environment ?? "",
    version: first?.version ?? "",
    event: first?.event ?? "",
    collector: "",
    tagPresent: tab.tags.length > 0,
    tags: tab.tags,
    trackTransPresent: tab.facts?.trackTransPresent ?? false,
    optedOut,
    warnings: warningsFor(tab, optedOut),
  };
};

/** A tab nothing is known about yet. */
export const nothingKnown = (site: string): TabTags => empty(site);
