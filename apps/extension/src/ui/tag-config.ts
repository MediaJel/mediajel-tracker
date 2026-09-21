import { ConfigSource, TagRecord } from "@mediajel/assistant-core/tags";

/**
 * A tag's configuration as the slip prints it: every parameter the tag runs with, grouped by what
 * it is for and labelled in words, with a note where a value needs one. Pure, so the words the
 * panel uses about a tag's setup are decided in one place and tested without a panel.
 */

export interface ConfigEntry {
  /** The param the value is read from — the name an edit to it sets. */
  key: string;
  label: string;
  value: string;
  /** A line under the value: what the value means when it is not what it seems. */
  note?: string;
  /** The older parameter name the value was read from, when the tag was configured under it. */
  legacy?: string;
}

export interface ConfigGroup {
  title: string;
  entries: ConfigEntry[];
}

export interface ConfigurationView {
  /** Where the slip's facts came from, as a sentence. */
  source: string;
  groups: ConfigGroup[];
  /** The script element's markup, or its URL when the markup was never seen. */
  markup: string;
}

const SOURCES: Record<ConfigSource, string> = {
  record: "From the tag’s own record event, after any overrides on the page.",
  announcement: "From the tag’s announcement.",
  script: "From the script on the page.",
  none: "",
};

/** The SDK a version number stands for — the one fact about a tag an engineer looks up most. */
const SDK: Record<string, string> = {
  "1": "1 · sp.js, Snowplow 2.14",
  "2": "2 · cnna.js, Snowplow 3.22",
};

/** The value the tag synthesises for a Dstillery segment when the page carries no overrides. */
const DSTILLERY_DEFAULT = "00000";

export interface ParamSpec {
  key: string;
  label: string;
  /** The older name the tag still reads for the same thing. */
  legacy?: string;
  /** The tag reads the older name first (`segmentId || s1`), so it wins when both are set. */
  legacyFirst?: boolean;
}

const SEGMENTS: ParamSpec[] = [
  { key: "s1", label: "LiquidM segment", legacy: "segmentId", legacyFirst: true },
  { key: "s2.pv", label: "Nexxen page-view beacon", legacy: "s2" },
  { key: "s2.tr", label: "Nexxen transaction beacon", legacy: "s2" },
  { key: "s3.pv", label: "Dstillery page-view", legacy: "s3" },
  { key: "s3.tr", label: "Dstillery transaction", legacy: "s3" },
];

const PLUGINS: ParamSpec[] = [
  { key: "plugin", label: "Plugins" },
  { key: "conversionId", label: "Google Ads conversion ID" },
  { key: "conversionLabel", label: "Google Ads conversion label" },
  { key: "crossDomainSites", label: "Google Ads cross-domain sites" },
  { key: "tagId", label: "Bing Ads tag ID" },
];

const CONTROLS: ParamSpec[] = [
  { key: "logs", label: "Logging" },
  { key: "debug", label: "Debug" },
  { key: "debugger", label: "Snowplow debugger" },
  { key: "test", label: "Test" },
];

/** Keys that are printed by name elsewhere on the slip, or are the tag's own markup. */
const LIFTED = new Set(["appId", "mediajelAppId", "version", "environment", "event", "collector", "tag", "enable"]);

const identity = (tag: TagRecord): ConfigGroup => ({
  title: "Identity",
  entries: [
    { key: "appId", label: "App ID", value: tag.appId },
    {
      key: "environment",
      label: "Environment",
      value: tag.environment || "production",
      note: tag.environment ? undefined : "default",
    },
    { key: "version", label: "Version", value: SDK[tag.version] ?? tag.version },
    { key: "event", label: "Event", value: tag.event || "not set" },
    { key: "collector", label: "Collector", value: tag.collector || "not set" },
  ],
});

/** The names a spec's value can be read from, in the order the tag reads them. */
const namesOf = (spec: ParamSpec): string[] => {
  const names = spec.legacy ? [spec.key, spec.legacy] : [spec.key];
  return spec.legacyFirst ? names.reverse() : names;
};

/** Which of a spec's names the tag's value is read from — the first it has, in the tag's own order — or null. */
export const readFrom = (spec: ParamSpec, params: Record<string, string>): string | null =>
  namesOf(spec).find((name) => name in params) ?? null;

/** The entry for a spec, or nothing when the tag has neither of its names. */
const entryFor = (spec: ParamSpec, params: Record<string, string>): ConfigEntry | null => {
  const from = readFrom(spec, params);
  if (from === null) return null;
  const value = params[from];
  return {
    key: from,
    label: spec.label,
    value,
    note: value === DSTILLERY_DEFAULT ? "not configured (tag default)" : undefined,
    legacy: from === spec.key ? undefined : from,
  };
};

const group = (title: string, specs: ParamSpec[], params: Record<string, string>): ConfigGroup => ({
  title,
  entries: specs.map((spec) => entryFor(spec, params)).filter((entry): entry is ConfigEntry => entry !== null),
});

/** `enable` comes from the record, not the params: it is what the tag did with the value. */
const controls = (tag: TagRecord, params: Record<string, string>): ConfigGroup => {
  const built = group("Controls", CONTROLS, params);
  const enable = { key: "enable", label: "Enabled", value: tag.enabled ? "yes" : "no (enable=false)" };
  return { ...built, entries: [enable, ...built.entries] };
};

const consumed = new Set([...SEGMENTS, ...PLUGINS, ...CONTROLS].flatMap((spec) => [spec.key, spec.legacy ?? ""]));

/** The params an editor offers by name, grouped as the slip prints them, whether or not the tag sets them. */
export const EDITABLE: { title: string; specs: ParamSpec[] }[] = [
  { title: "Audience segments", specs: SEGMENTS },
  { title: "Plugins", specs: PLUGINS },
  { title: "Controls", specs: [{ key: "enable", label: "Enabled" }, ...CONTROLS] },
];

/** Whether a param is one the slip prints by name, rather than under "Other parameters". */
export const isNamedParam = (key: string): boolean => LIFTED.has(key) || consumed.has(key);

/** Every parameter nothing above claimed, in order, its key as its label. */
const other = (params: Record<string, string>): ConfigGroup => ({
  title: "Other parameters",
  entries: Object.keys(params)
    .filter((key) => !LIFTED.has(key) && !consumed.has(key))
    .sort()
    .map((key) => ({ key, label: key, value: params[key] })),
});

/**
 * The slip for a tag, or null for a tag heard only on the wire — the line under its app ID already
 * says the page names nothing about it.
 */
export const configurationOf = (tag: TagRecord): ConfigurationView | null => {
  const config = tag.config;
  if (!config) return null;
  const params = config.params;
  const groups = [
    identity(tag),
    group("Audience segments", SEGMENTS, params),
    group("Plugins", PLUGINS, params),
    controls(tag, params),
    other(params),
  ].filter((entry) => entry.entries.length > 0);
  return { source: SOURCES[config.source], groups, markup: config.element || config.src };
};
