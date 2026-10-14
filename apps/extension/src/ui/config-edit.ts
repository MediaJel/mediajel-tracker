import { TagRecord } from "@mediajel/assistant-core/tags";

import { EDITABLE, ParamSpec, isNamedParam, readFrom } from "~/ui/tag-config";

/**
 * Editing a tag's configuration, decided without a panel.
 *
 * An edit is a set of params the tag should run with instead of its own — exactly what the
 * assistant service renders into the tag's app-id file as `window.overrides[appId]`. The editor
 * starts from the set already tried on the page, or already deployed to the file, so an edit never
 * silently drops what an earlier one set; the engineer changes values, undoes them, or stops
 * overriding a param the earlier edit set, and the set that results is what is tried and deployed.
 */

export type Edits = Record<string, string>;

export interface EditField {
  /** The param an edit to this field sets. */
  key: string;
  label: string;
  /** What the tag runs with now; "" when it has no value. */
  now: string;
  /** `now` was read from this older name, which the tag still honours. */
  legacy?: string;
  /** The other name the tag reads when this one is empty, when the tag has it. */
  fallback?: string;
}

export interface EditGroup {
  title: string;
  fields: EditField[];
}

const IDENTITY: { key: string; label: string; now(tag: TagRecord): string }[] = [
  { key: "appId", label: "App ID", now: (tag) => tag.appId },
  { key: "environment", label: "Environment", now: (tag) => tag.environment },
  { key: "version", label: "Version", now: (tag) => tag.version },
  { key: "event", label: "Event", now: (tag) => tag.event },
  { key: "collector", label: "Collector", now: (tag) => tag.collector },
];

/** A spec's names in the order the tag reads them. */
const orderOf = (spec: ParamSpec): string[] => {
  const names = spec.legacy ? [spec.key, spec.legacy] : [spec.key];
  return spec.legacyFirst ? names.reverse() : names;
};

/** A named param as a field: the name the tag reads now (or the spec's own), and the one it falls back to. */
const specField = (spec: ParamSpec, params: Edits): EditField => {
  const from = readFrom(spec, params) ?? spec.key;
  const fallback = orderOf(spec).find((name) => name !== from && name in params);
  return {
    key: from,
    label: spec.label,
    now: params[from] ?? "",
    ...(from === spec.key ? {} : { legacy: from }),
    ...(fallback ? { fallback } : {}),
  };
};

/** Every param the slip does not print by name — the tag's own and any the engineer added — in order. */
const otherFields = (params: Edits, draft: Edits): EditField[] =>
  [...new Set([...Object.keys(params), ...Object.keys(draft)])]
    .filter((key) => !isNamedParam(key))
    .sort()
    .map((key) => ({ key, label: key, now: params[key] ?? "" }));

/** The fields an editor offers for a tag, in the configuration slip's groups; a group with nothing is left out. */
export const editGroups = (tag: TagRecord, draft: Edits): EditGroup[] => {
  const params = tag.config?.params ?? {};
  return [
    {
      title: "Identity",
      fields: IDENTITY.map((field) => ({ key: field.key, label: field.label, now: field.now(tag) })),
    },
    ...EDITABLE.map(({ title, specs }) => ({ title, fields: specs.map((spec) => specField(spec, params)) })),
    { title: "Other parameters", fields: otherFields(params, draft) },
  ].filter((group) => group.fields.length > 0);
};

/** The app ID the tag reads `window.overrides` by: the one its URL names, which a flat override may have renamed since. */
export const overridesKeyOf = (tag: TagRecord): string => {
  try {
    const url = new URL(tag.config?.src ?? "");
    return url.searchParams.get("appId") || url.searchParams.get("mediajelAppId") || tag.appId;
  } catch {
    return tag.appId;
  }
};

/** A value typed into a field: an edit, unless it is what the tag already runs with and was never one. */
export const withValue = (draft: Edits, start: Edits, field: EditField, value: string): Edits => {
  const next = { ...draft, [field.key]: value };
  if (value === field.now && !(field.key in start)) delete next[field.key];
  return next;
};

/** A field put back the way the editor found it. */
export const undone = (draft: Edits, start: Edits, key: string): Edits => {
  const next = { ...draft };
  if (key in start) next[key] = start[key];
  else delete next[key];
  return next;
};

/** An earlier edit's param no longer overridden: the tag goes back to its own value. */
export const released = (draft: Edits, key: string): Edits => {
  const next = { ...draft };
  delete next[key];
  return next;
};

export type FieldState = "none" | "kept" | "edited" | "released";

/** Where a field stands against the edit the editor started from. */
export const stateOf = (draft: Edits, start: Edits, key: string): FieldState => {
  if (!(key in draft)) return key in start ? "released" : "none";
  return key in start && start[key] === draft[key] ? "kept" : "edited";
};

/** How many fields differ from where the editor started — what trying it would change. */
export const changeCount = (draft: Edits, start: Edits): number =>
  [...new Set([...Object.keys(draft), ...Object.keys(start)])].filter((key) => {
    const state = stateOf(draft, start, key);
    return state === "edited" || state === "released";
  }).length;

const CONSEQUENCES: Record<string, (value: string) => string> = {
  appId: () => "The tag reports as another app ID.",
  collector: () => "The tag sends to another collector.",
  enable: (value) => (value === "false" ? "The tag switches off." : ""),
};

/** What an edit does that is worth saying before it is tried — nothing, for a value the tag already runs with. */
export const consequenceOf = (field: EditField, value: string): string => {
  if (value === field.now) return "";
  if (value === "" && field.fallback) return `Empty, so the tag reads ${field.fallback} instead.`;
  return CONSEQUENCES[field.key]?.(value) ?? "";
};

/** The name a param added by hand may have: what the tag reads off a URL, and nothing that could be code. */
export const PARAM_NAME = /^[A-Za-z0-9_.-]{1,64}$/;
