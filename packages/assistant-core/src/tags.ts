import { TagSummary, tagParams } from "@mediajel/assistant-core/context";

/**
 * What is known about the MediaJel tags on one tab's page, and how each new piece of evidence
 * changes it.
 *
 * Evidence arrives from several places at different times — the page's Snowplow queue naming the
 * trackers it holds, the script elements read out of the page, a beacon heard on the wire, the tag
 * announcing itself, the tag's own record event — and none of them sees the whole picture. This
 * module is the one place they meet: a pure merge that never reorders rows, never forgets a tag,
 * and never lets a state slide backwards, plus the status the rest of the product derives from
 * it. Pure, so every rule is a test.
 */

export type TagState = "installed" | "held-back" | "running" | "sending" | "opted-out" | "disabled" | "failed";

/**
 * Where a tag's configuration was read from, lowest rank first: the script on the page, the tag's
 * announcement of itself, the tag's own record event — the one source that carries every
 * parameter the tag runs with, after any overrides on the page.
 */
export type ConfigSource = "none" | "script" | "announcement" | "record";

export interface TagConfiguration {
  /**
   * Every parameter the tag runs with, keyed as the tag reads it (`s2.pv`, `conversionId`, …).
   * The app ID, version, environment, event and collector are lifted onto the record instead.
   */
  params: Record<string, string>;
  /** The script's URL; "" when no source could read it. */
  src: string;
  /** The `<script>` element's markup, capped; "" when no source had it. */
  element: string;
  source: ConfigSource;
}

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
  /** The host the tag sends its events to; "" until a source says. */
  collector: string;
  /** False only when the tag runs with `enable=false`. */
  enabled: boolean;
  /** The tag's configuration, from the highest-ranked source that has spoken; null until one has. */
  config: TagConfiguration | null;
  /** When the wire last carried one of this tag's events; null until it has. */
  lastHeardAt: number | null;
}

/** What the tag's own record event says about it: the configuration it runs with, after any overrides. */
export interface RecordedTag {
  appId: string;
  environment: string;
  version: string;
  event: string;
  /** Host only. */
  collector: string;
  config: TagConfiguration;
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
  /** The first tag's collector host; "" until a source says. */
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
  /** As the tag wrote it: `//host`, a URL, or the bare host. */
  collector?: string;
  /** False only when the tag is switched off, on its URL or in `window.overrides`. */
  enable?: boolean;
  /** The script's URL, when the tag could read its own. */
  src?: string;
}

export type Evidence =
  /** A new document in the tab, or a bridge attached to one. */
  | { kind: "document" }
  | { kind: "announced"; tag: AnnouncedTag }
  /** The page's Snowplow queue named these trackers. */
  | { kind: "running"; appIds: string[] }
  /** The tag scripts read out of the page. */
  | { kind: "scripts"; tags: TagSummary[] }
  /** Events heard on the wire: the tags they named, the host they went to, and any record event among them. */
  | { kind: "beacon"; appIds: string[]; collector?: string; records?: RecordedTag[] }
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

/** A source higher up wins key by key over one below it; an equal or lower one fills the gaps. */
const CONFIG_RANK: Record<ConfigSource, number> = { none: 0, script: 1, announcement: 2, record: 3 };

const NO_CONFIG: TagConfiguration = { params: {}, src: "", element: "", source: "none" };

/** What a record holds before any source has spoken — and what an older worker's rows never wrote. */
const DEFAULTS: Pick<TagRecord, "collector" | "enabled" | "config" | "lastHeardAt"> = {
  collector: "",
  enabled: true,
  config: null,
  lastHeardAt: null,
};

const text = (value: string | undefined): string => value ?? "";

const first = (winner: string, filler: string): string => winner || filler;

/** The host a collector is named by, whichever way the tag wrote it: `//host`, `https://host/path`, or the bare host. */
export const collectorHost = (value: string): string =>
  value
    .trim()
    .replace(/^[a-z][a-z0-9+.-]*:/i, "")
    .replace(/^\/\//, "")
    .split(/[/?#]/)[0];

const complete = (record: TagRecord): boolean => Object.keys(DEFAULTS).every((key) => key in record);

/** A record as an older worker wrote it, completed with what that worker never knew; the record itself when it is complete. */
export const withDefaults = (record: TagRecord): TagRecord => (complete(record) ? record : { ...DEFAULTS, ...record });

const completed = (tab: TabTags): TabTags =>
  tab.tags.every(complete) ? tab : { ...tab, tags: tab.tags.map(withDefaults) };

const empty = (site: string): TabTags => ({ site, settled: false, facts: null, tags: [] });

const fresh = (appId: string, now: number): TagRecord => ({
  appId,
  state: "installed",
  environment: "",
  version: "",
  event: "",
  announced: false,
  firstSeenAt: now,
  ...DEFAULTS,
});

const raise = (record: TagRecord, state: TagState): TagRecord => {
  const higher = RANK[state] > RANK[record.state];
  const sideways = RANK[state] === 0 && RANK[record.state] === 0 && state !== record.state;
  return higher || sideways ? { ...record, state } : record;
};

type Change = (record: TagRecord) => TagRecord;

/** Applies a change to one tag's record, adding the record first when the tag is new. */
const upsert = (tags: TagRecord[], appId: string, now: number, change: Change): TagRecord[] => {
  const index = tags.findIndex((record) => record.appId === appId);
  if (index === -1) return [...tags, change(fresh(appId, now))];
  const next = change(tags[index]);
  return next === tags[index] ? tags : tags.map((record, i) => (i === index ? next : record));
};

/** Whether two records hold the same values — configurations by reference, which the layering keeps when nothing changed. */
const sameRecord = (a: TagRecord, b: TagRecord): boolean =>
  Object.keys(a).length === Object.keys(b).length &&
  (Object.keys(a) as (keyof TagRecord)[]).every((key) => a[key] === b[key]);

const sameParams = (a: Record<string, string>, b: Record<string, string>): boolean =>
  Object.keys(a).length === Object.keys(b).length && Object.entries(a).every(([key, value]) => b[key] === value);

const sameConfig = (a: TagConfiguration, b: TagConfiguration): boolean =>
  a.src === b.src && a.element === b.element && a.source === b.source && sameParams(a.params, b.params);

/** `over` wins key by key and `under` fills the gaps; the current configuration itself when that changes nothing. */
const layered = (
  over: TagConfiguration,
  under: TagConfiguration,
  current: TagConfiguration | null,
): TagConfiguration => {
  const next: TagConfiguration = {
    params: { ...under.params, ...over.params },
    src: first(over.src, under.src),
    element: first(over.element, under.element),
    source: over.source,
  };
  return current && sameConfig(current, next) ? current : next;
};

/** What one source says about a tag: the fields a record lifts out, and the configuration under them. */
interface Said {
  environment: string;
  version: string;
  event: string;
  collector: string;
  config: TagConfiguration;
}

const known = (record: TagRecord): Said => ({
  environment: record.environment,
  version: record.version,
  event: record.event,
  collector: record.collector,
  config: record.config ?? NO_CONFIG,
});

/**
 * Lays what a source said over or under what is known, by rank: a higher source wins key by key,
 * an equal or lower one fills the gaps. The record itself when nothing changes.
 */
const informed = (record: TagRecord, said: Said): TagRecord => {
  const held = known(record);
  const outranks = CONFIG_RANK[said.config.source] > CONFIG_RANK[held.config.source];
  const [over, under] = outranks ? [said, held] : [held, said];
  const config = layered(over.config, under.config, record.config);
  const next: TagRecord = {
    ...record,
    environment: first(over.environment, under.environment),
    version: first(over.version, under.version),
    event: first(over.event, under.event),
    collector: first(over.collector, under.collector),
    enabled: config.params.enable !== "false",
    config,
  };
  return sameRecord(record, next) ? record : next;
};

/** The URL's parameters, with `enable` as the tag settled it — `window.overrides` can switch off a tag its URL does not. */
const announcedParams = (tag: AnnouncedTag): Record<string, string> => ({
  ...tagParams(text(tag.src)),
  ...(tag.enable === undefined ? {} : { enable: String(tag.enable) }),
});

const saidByAnnouncement = (tag: AnnouncedTag): Said => ({
  environment: text(tag.environment),
  version: text(tag.version),
  event: text(tag.event),
  collector: collectorHost(text(tag.collector)),
  config: { params: announcedParams(tag), src: text(tag.src), element: "", source: "announcement" },
});

const stateOf = (tag: AnnouncedTag): TagState => ANNOUNCED_STATES[tag.state ?? ""] ?? "installed";

const errorOf = (tag: AnnouncedTag): Pick<TagRecord, "error"> => (tag.error === undefined ? {} : { error: tag.error });

const fromAnnouncement = (record: TagRecord, tag: AnnouncedTag): TagRecord => {
  const next = { ...informed(raise(record, stateOf(tag)), saidByAnnouncement(tag)), ...errorOf(tag), announced: true };
  return sameRecord(record, next) ? record : next;
};

const announced = (tags: TagRecord[], tag: AnnouncedTag, now: number): TagRecord[] =>
  upsert(tags, tag.appId, now, (record) => fromAnnouncement(record, tag));

const raised = (tags: TagRecord[], appIds: string[], state: TagState, now: number): TagRecord[] =>
  appIds.reduce((acc, appId) => upsert(acc, appId, now, (record) => raise(record, state)), tags);

const saidByScript = (script: TagSummary): Said => ({
  environment: script.environment,
  version: script.version,
  event: script.event,
  collector: "",
  config: { params: script.params, src: script.src, element: script.element, source: "script" },
});

/** A script names a tag that may not have run; it fills what is empty and only ever moves a rank-0 state. */
const fromScript = (record: TagRecord, script: TagSummary): TagRecord => {
  const filled = informed(record, saidByScript(script));
  return RANK[record.state] === 0 ? raise(filled, script.delayed ? "held-back" : "installed") : filled;
};

const scripts = (tags: TagRecord[], found: TagSummary[], now: number): TagRecord[] =>
  found.reduce((acc, script) => upsert(acc, script.appId, now, (record) => fromScript(record, script)), tags);

/** A tag heard on the wire is sending; the wire also says where to, and when. */
const heardFrom = (record: TagRecord, collector: string, now: number): TagRecord => {
  const next = { ...raise(record, "sending"), collector: first(record.collector, collector), lastHeardAt: now };
  return sameRecord(record, next) ? record : next;
};

type Beacon = Extract<Evidence, { kind: "beacon" }>;

/** Every tag the wire named is sending; a record event among the beacons is the tag's own word on its configuration. */
const heard = (tags: TagRecord[], beacon: Beacon, now: number): TagRecord[] => {
  const sending = beacon.appIds.reduce(
    (acc, appId) => upsert(acc, appId, now, (record) => heardFrom(record, text(beacon.collector), now)),
    tags,
  );
  return (beacon.records ?? []).reduce(
    (acc, recorded) => upsert(acc, recorded.appId, now, (record) => informed(record, recorded)),
    sending,
  );
};

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
      return { ...tab, tags: heard(tab.tags, evidence, now) };
    case "facts":
      return withFacts(tab, evidence.facts);
    case "settled":
      return { ...tab, settled: true };
  }
};

const same = (a: TabTags, b: TabTags): boolean => a.settled === b.settled && a.facts === b.facts && a.tags === b.tags;

/** What is on record for this site — completed when an older worker wrote it — or nothing, for a tab that moved. */
const standing = (current: TabTags | null, site: string): TabTags =>
  current !== null && current.site === site ? completed(current) : empty(site);

/**
 * What is known after this evidence — or null when it changed nothing, so nothing is written or
 * pushed. A tab that has moved to another site starts over: its records described somebody else's page.
 */
export const merge = (current: TabTags | null, site: string, evidence: Evidence, now: number): TabTags | null => {
  const before = standing(current, site);
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
  const lead = tab.tags[0] ?? fresh("", 0);
  const optedOut = tab.facts?.optedOut === true || tab.tags.some((tag) => tag.state === "opted-out");
  return {
    appId: lead.appId,
    environment: lead.environment,
    version: lead.version,
    event: lead.event,
    collector: lead.collector,
    tagPresent: tab.tags.length > 0,
    tags: tab.tags,
    trackTransPresent: tab.facts?.trackTransPresent ?? false,
    optedOut,
    warnings: warningsFor(tab, optedOut),
  };
};

/** A tab nothing is known about yet. */
export const nothingKnown = (site: string): TabTags => empty(site);
