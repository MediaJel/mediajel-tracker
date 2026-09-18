import { maskObject } from "@mediajel/assistant-core/session/masking";
import {
  CONSUMED,
  EVENT_KINDS,
  GROUP_LABELS,
  GROUP_ORDER,
  PAYLOAD_DATA_RE,
  PROTOCOL,
} from "@mediajel/assistant-core/wire/protocol";
import { recordedTagOf } from "@mediajel/assistant-core/wire/record";
import type {
  CollectorEvent,
  Entity,
  Field,
  FieldGroup,
  ProtocolGroup,
  SelfDescribing,
  Transport,
} from "@mediajel/assistant-core/wire/types";

/**
 * What a request to a collector says, decoded the way the tracker encoded it.
 *
 * A MediaJel tag POSTs batches to its collector as a `payload_data` document whose `data` holds
 * one element per event; older trackers can send a GET pixel to `/i` with the same fields in the
 * query. A self-describing event travels inside `ue_pr` (JSON) or `ue_px` (base64url JSON) under
 * an `unstruct_event` wrapper; the entities travel inside `co`/`cx` under a `contexts` wrapper.
 * Both are unwrapped here and never validated — reading them needs no schema registry and sends
 * nothing anywhere.
 */

/** One event as the tracker sent it: a GET pixel's query, or one entry of a POSTed batch's `data`. */
type Element = Record<string, unknown>;

/** A decoded event before the ledger gives it its place: everything but where and when it was heard. */
type DecodedEvent = Omit<CollectorEvent, "id" | "seq" | "at" | "request" | "pageKey" | "outcome">;

const UNKNOWN_KIND = { kind: "unknown", label: "Event" } as const;
const SCHEMA_RE = /^iglu:([^/]+)\/([^/]+)\/jsonschema\/([^/]+)$/;
const UNSTRUCT_RE = /\/unstruct_event\//;
const CONTEXTS_RE = /\/contexts\//;
const SIGN_UP_RE = /\/sign_up\//;

const isElement = (value: unknown): value is Element =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const textOf = (value: unknown): string | null => (typeof value === "string" ? value : null);

const stringOf = (value: unknown): string => textOf(value) ?? "";

const jsonText = (value: unknown): string => JSON.stringify(value ?? null);

const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

/** Text from base64url — the `-`/`_` alphabet, padding optional, malformed UTF-8 repaired — or null for anything else. */
const base64UrlToText = (value: string): string | null => {
  const standard = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = standard.padEnd(standard.length + ((4 - (standard.length % 4)) % 4), "=");
  try {
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return null;
  }
};

const decodedText = (value: unknown): string | null => {
  const text = textOf(value);
  return text === null ? null : base64UrlToText(text);
};

/** `{ schema, data }` with a string schema, or null. */
const selfDescribing = (value: unknown): SelfDescribing | null => {
  const candidate = value as Partial<SelfDescribing> | null;
  return isElement(candidate) && typeof candidate.schema === "string"
    ? { schema: candidate.schema, data: candidate.data }
    : null;
};

const schemaParts = (schema: string): { vendor: string; name: string; version: string } | null => {
  const match = SCHEMA_RE.exec(schema);
  return match ? { vendor: match[1], name: match[2], version: match[3] } : null;
};

/** The self-describing JSON a pair of keys carries: the plain-JSON key, else the base64url one. */
const carried = (element: Element, plain: string, encoded: string): SelfDescribing | null => {
  const raw = textOf(element[plain]) ?? decodedText(element[encoded]);
  return raw === null ? null : selfDescribing(parseJson(raw));
};

/** The event inside `ue_pr`/`ue_px`, without its `unstruct_event` wrapper; null when either layer is not one. */
const eventOf = (element: Element): SelfDescribing | null => {
  const outer = carried(element, "ue_pr", "ue_px");
  return outer && UNSTRUCT_RE.test(outer.schema) ? selfDescribing(outer.data) : null;
};

const named = (described: SelfDescribing): Entity | null => {
  const parts = schemaParts(described.schema);
  return parts ? { schema: described.schema, ...parts, data: jsonText(described.data), truncated: false } : null;
};

const entityOf = (entry: unknown): Entity[] => {
  const described = selfDescribing(entry);
  const entity = described && named(described);
  return entity ? [entity] : [];
};

/** The entities inside `co`/`cx`, without their `contexts` wrapper; [] when either layer is not one. */
const entitiesOf = (element: Element): Entity[] => {
  const outer = carried(element, "co", "cx");
  const inner = outer && CONTEXTS_RE.test(outer.schema) && Array.isArray(outer.data) ? outer.data : [];
  return inner.flatMap(entityOf);
};

const valueText = (value: unknown): string => textOf(value) ?? jsonText(value);

/** A field in its protocol group under our label; a key the protocol does not name goes under "other" as itself. */
const placed = (key: string, value: unknown): [ProtocolGroup, Field] => {
  const known = PROTOCOL[key];
  const label = known ? known.label : key;
  return [known ? known.group : "other", { key, label, value: valueText(value) }];
};

const groupOf = (group: ProtocolGroup, fields: [ProtocolGroup, Field][]): FieldGroup[] => {
  const own = fields.filter(([where]) => where === group).map(([, field]) => field);
  return own.length > 0 ? [{ group, label: GROUP_LABELS[group], fields: own }] : [];
};

/** Every field of the element in its group, groups in protocol order; the consumed keys are never listed. */
const groupFields = (element: Element): FieldGroup[] => {
  const fields = Object.entries(element)
    .filter(([key]) => !CONSUMED.has(key))
    .map(([key, value]) => placed(key, value));
  return GROUP_ORDER.flatMap((group) => groupOf(group, fields));
};

const nameOf = (inner: SelfDescribing): string => schemaParts(inner.schema)?.name ?? inner.schema;

/** A sign-up's data is a person's; it is masked before it is kept, as every recording is. */
const payloadText = (inner: SelfDescribing): string =>
  jsonText(SIGN_UP_RE.test(inner.schema) ? maskObject(inner.data) : inner.data);

const recordOf = (inner: SelfDescribing): Pick<CollectorEvent, "record"> => {
  const record = recordedTagOf(inner);
  return record ? { record } : {};
};

type Described = Pick<CollectorEvent, "name" | "schema" | "payload" | "record">;

/** What the inner event adds to a row — its name, schema and data — or the kind's own name when there is none to read. */
const described = (inner: SelfDescribing | null, fallback: string): Described =>
  inner
    ? { name: nameOf(inner), schema: inner.schema, payload: payloadText(inner), ...recordOf(inner) }
    : { name: fallback };

const innerOf = (element: Element, kind: string): SelfDescribing | null =>
  kind === "self-describing" ? eventOf(element) : null;

/** Where a request went and how, shared by every event it carried. */
interface Carriage {
  collector: string;
  transport: Transport;
  size: number;
}

const decodeElement = (element: Element, index: number, carriage: Carriage): DecodedEvent => {
  const code = stringOf(element.e);
  const kind = EVENT_KINDS[code] ?? UNKNOWN_KIND;
  return {
    source: "collector",
    transport: carriage.transport,
    collector: carriage.collector,
    kind: kind.kind,
    code,
    ...described(innerOf(element, kind.kind), kind.label),
    groups: groupFields(element),
    entities: entitiesOf(element),
    batch: { index, size: carriage.size },
    appId: stringOf(element.aid),
    pageUrl: stringOf(element.url),
  };
};

const isPayloadData = (batch: unknown): batch is { data: unknown[] } => {
  const document = selfDescribing(batch);
  return document !== null && PAYLOAD_DATA_RE.test(document.schema) && Array.isArray(document.data);
};

/** The elements of a POSTed `payload_data` batch; [] for any other body. */
const batchElements = (body: string): Element[] => {
  const batch = parseJson(body);
  return isPayloadData(batch) ? batch.data.filter(isElement) : [];
};

/** A GET pixel: Snowplow's `/i` path with its tracker version in the query; [] for any other URL. */
const pixelElements = (url: URL): Element[] =>
  /\/i$/.test(url.pathname) && url.searchParams.has("tv") ? [Object.fromEntries(url.searchParams.entries())] : [];

const parseUrl = (url: string): URL | null => {
  try {
    return new URL(url);
  } catch {
    return null;
  }
};

/**
 * Every event a request to a collector carries — a POSTed batch's elements, or a GET pixel's
 * query — decoded in the order sent; [] for a preflight, a tag file, or anything else.
 */
export const decodeCollectorRequest = ({ url, body }: { url: string; body?: string }): DecodedEvent[] => {
  const parsed = parseUrl(url);
  if (parsed === null) return [];
  const elements = body === undefined ? pixelElements(parsed) : batchElements(body);
  const transport: Transport = body === undefined ? "get" : "post";
  const carriage: Carriage = { collector: parsed.hostname, transport, size: elements.length };
  return elements.map((element, index) => decodeElement(element, index, carriage));
};
