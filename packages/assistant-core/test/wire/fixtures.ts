import { PendingEvent } from "@mediajel/assistant-core/wire/types";

/**
 * What is on the wire, as observed on unity-rd.com (read-only, 2026-09-19): the v1 tag's page
 * view and, in the next POST, the `record` event carrying the tag's whole context. The values
 * that identify a visitor are made up; the shapes are the tracker's.
 */

export const APP_ID = "5b677990-d3a8-49eb-9d18-15d686ad6e1a";
export const COLLECTOR_URL = "https://collector-azsx401.dmp.cnna.io/analytics/track";
export const RECORD_SCHEMA = "iglu:com.mediajel.events/record/jsonschema/1-0-2";
export const TAG_SRC = `https://tags.cnna.io/?segmentId=e-oqTEY2SNGlRzvmH9esjw&appId=${APP_ID}&environment=dutchie-subdomain`;

/** base64url as the tracker writes it: the `-`/`_` alphabet, no padding. */
export const b64url = (value: unknown): string =>
  btoa(unescape(encodeURIComponent(JSON.stringify(value))))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export const unstruct = (schema: string, data: unknown): unknown => ({
  schema: "iglu:com.snowplowanalytics.snowplow/unstruct_event/jsonschema/1-0-0",
  data: { schema, data },
});

export const contexts = (...entities: unknown[]): unknown => ({
  schema: "iglu:com.snowplowanalytics.snowplow/contexts/jsonschema/1-0-0",
  data: entities,
});

export const batch = (...events: Record<string, unknown>[]): string =>
  JSON.stringify({ schema: "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4", data: events });

export const PAGE_VIEW: Record<string, unknown> = {
  e: "pv",
  url: "https://unity-rd.com/",
  page: "Unity Rd. | Dispensary",
  tv: "js-2.14.0",
  tna: APP_ID,
  aid: APP_ID,
  p: "web",
  tz: "America/Chicago",
  lang: "en-US",
  cs: "UTF-8",
  f_pdf: "1",
  f_qt: "0",
  res: "1280x900",
  cd: "24",
  cookie: "1",
  eid: "6d2c0a7e-1b3f-4e9a-9c1d-2f8e7a6b5c4d",
  dtm: "1758294000000",
  vp: "1280x800",
  ds: "1280x2410",
  vid: "1",
  sid: "0f1e2d3c-4b5a-6978-8a9b-0c1d2e3f4a5b",
  duid: "a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d",
};

/** The tag's context as `record` sends it: every URL param, the defaults, the build's collector, the script's markup. */
export const RECORD_DATA: Record<string, unknown> = {
  segmentId: "e-oqTEY2SNGlRzvmH9esjw",
  appId: APP_ID,
  version: "1",
  environment: "dutchie-subdomain",
  collector: "//collector-azsx401.dmp.cnna.io",
  tag: `<script src="${TAG_SRC}"></script>`,
};

export const RECORD: Record<string, unknown> = {
  e: "ue",
  ue_px: b64url(unstruct(RECORD_SCHEMA, RECORD_DATA)),
  url: "https://unity-rd.com/",
  tv: "js-2.14.0",
  tna: APP_ID,
  aid: APP_ID,
  p: "web",
  eid: "7e3d1b8f-2c4a-4f0b-8d2e-3a9f8b7c6d5e",
  dtm: "1758294000210",
};

/** A decoded page view as the ledger receives it, before it has a `seq`. */
export const pendingEvent = (overrides: Partial<PendingEvent> = {}): PendingEvent => ({
  id: "r1:0",
  at: 1_758_294_000_000,
  request: "r1",
  pageKey: "doc-1",
  pageUrl: "https://unity-rd.com/",
  appId: APP_ID,
  outcome: { kind: "pending" },
  source: "collector",
  transport: "post",
  collector: "collector-azsx401.dmp.cnna.io",
  kind: "page-view",
  code: "pv",
  name: "Page view",
  groups: [],
  entities: [],
  batch: { index: 0, size: 1 },
  ...overrides,
});
