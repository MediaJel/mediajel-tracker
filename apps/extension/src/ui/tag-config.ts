import { ConfigSource, TagRecord } from "@mediajel/assistant-core/tags";

/**
 * A tag's configuration as the slip prints it: every parameter the tag runs with, grouped by what
 * it is for and labelled in words, with a note where a value needs one. Pure, so the words the
 * panel uses about a tag's setup are decided in one place and tested without a panel.
 */

export interface ConfigEntry {
  label: string;
  value: string;
  note?: string;
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

interface ParamSpec {
  key: string;
  label: string;
  /** The older name the tag still reads for the same thing. */
  legacy?: string;
}

const SEGMENTS: ParamSpec[] = [
  { key: "s1", label: "LiquidM segment", legacy: "segmentId" },
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
    { label: "App ID", value: tag.appId },
    { label: "Environment", value: tag.environment || "production", note: tag.environment ? undefined : "default" },
    { label: "Version", value: SDK[tag.version] ?? tag.version },
    { label: "Event", value: tag.event || "not set" },
    { label: "Collector", value: tag.collector || "not set" },
  ],
});

/** A note beside a segment value: which older name carried it, or that the tag defaulted it. */
const segmentNote = (spec: ParamSpec, params: Record<string, string>, value: string): string | undefined => {
  if (value === DSTILLERY_DEFAULT) return "not configured (tag default)";
  return spec.key in params ? undefined : `legacy name ${spec.legacy}`;
};

/** The entry for a spec, from its own key or its legacy name; nothing when the tag has neither. */
const entryFor = (spec: ParamSpec, params: Record<string, string>): ConfigEntry | null => {
  const value = params[spec.key] ?? (spec.legacy ? params[spec.legacy] : undefined);
  if (value === undefined) return null;
  return { label: spec.label, value, note: segmentNote(spec, params, value) };
};

const group = (title: string, specs: ParamSpec[], params: Record<string, string>): ConfigGroup => ({
  title,
  entries: specs.map((spec) => entryFor(spec, params)).filter((entry): entry is ConfigEntry => entry !== null),
});

/** `enable` comes from the record, not the params: it is what the tag did with the value. */
const controls = (tag: TagRecord, params: Record<string, string>): ConfigGroup => {
  const built = group("Controls", CONTROLS, params);
  const enable = { label: "Enabled", value: tag.enabled ? "yes" : "no (enable=false)" };
  return { ...built, entries: [enable, ...built.entries] };
};

const consumed = new Set([...SEGMENTS, ...PLUGINS, ...CONTROLS].flatMap((spec) => [spec.key, spec.legacy ?? ""]));

/** Every parameter nothing above claimed, in order, its key as its label. */
const other = (params: Record<string, string>): ConfigGroup => ({
  title: "Other parameters",
  entries: Object.keys(params)
    .filter((key) => !LIFTED.has(key) && !consumed.has(key))
    .sort()
    .map((key) => ({ label: key, value: params[key] })),
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
