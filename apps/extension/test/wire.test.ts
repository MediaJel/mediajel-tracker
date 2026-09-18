import { describe, expect, test } from "bun:test";

import { WIRE_TYPES, WIRE_URLS, capturedFrom, heard, outcomeOf } from "~/lib/wire";

/**
 * What the wire says, read off the details Chrome hands a `webRequest` listener. The requests are
 * the ones a MediaJel tag actually makes — captured from www.seedoflifelabs.com and unity-rd.com —
 * and the ones that only look like them.
 */

const COLLECTOR = "https://collector-azsx401.dmp.cnna.io/analytics/track";
const RECORD_SCHEMA = "iglu:com.mediajel.events/record/jsonschema/1-0-2";

const batch = (...events: Record<string, unknown>[]): string =>
  JSON.stringify({ schema: "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4", data: events });

const chunks = (body: string, ...at: number[]): { bytes: ArrayBuffer }[] => {
  const bytes = new TextEncoder().encode(body);
  const cuts = [0, ...at, bytes.length];
  return cuts.slice(1).map((end, i) => ({ bytes: bytes.slice(cuts[i], end).buffer as ArrayBuffer }));
};

const request = (overrides: Partial<chrome.webRequest.OnBeforeRequestDetails>) =>
  ({
    requestId: "r-1",
    tabId: 7,
    frameId: 0,
    initiator: "https://www.seedoflifelabs.com",
    documentId: "doc-1",
    url: COLLECTOR,
    method: "POST",
    type: "xmlhttprequest",
    timeStamp: 1_758_294_000_000,
    requestBody: { raw: chunks(batch({ e: "pv", aid: "7bc01df0", url: "https://www.seedoflifelabs.com/shop" })) },
    ...overrides,
  }) as chrome.webRequest.OnBeforeRequestDetails;

describe("which requests are heard", () => {
  test("the tab's own page names its site, its document and what it sent", () => {
    expect(capturedFrom(request({}))).toEqual({
      tabId: 7,
      site: "www.seedoflifelabs.com",
      request: "r-1",
      url: COLLECTOR,
      method: "POST",
      body: batch({ e: "pv", aid: "7bc01df0", url: "https://www.seedoflifelabs.com/shop" }),
      at: 1_758_294_000_000,
      pageKey: "doc-1",
    });
  });

  test("reads the whole body, however many chunks it arrives in", () => {
    const body = batch({ e: "pv", aid: "first" }, { e: "ue", aid: "second", note: "café" });
    expect(capturedFrom(request({ requestBody: { raw: chunks(body, 30, 31, 70) } }))?.body).toBe(body);
  });

  test("form data is not a body it can read, and neither is no body at all", () => {
    expect(capturedFrom(request({ requestBody: { formData: { e: ["pv"] } } }))?.body).toBeUndefined();
    expect(capturedFrom(request({ requestBody: undefined }))?.body).toBeUndefined();
  });

  test("a page whose document the browser did not name is keyed by its origin", () => {
    expect(capturedFrom(request({ documentId: undefined }))?.pageKey).toBe("origin:https://www.seedoflifelabs.com");
  });

  test("an embedded frame on another host is not the tab's page", () => {
    expect(capturedFrom(request({ frameId: 4, initiator: "https://menu.example.com" }))).toBeNull();
  });

  test("a request from no tab, from a page with no site, or a preflight names nothing", () => {
    expect(capturedFrom(request({ tabId: -1 }))).toBeNull();
    expect(capturedFrom(request({ initiator: "null" }))).toBeNull();
    expect(capturedFrom(request({ initiator: undefined }))).toBeNull();
    expect(capturedFrom(request({ method: "OPTIONS" }))).toBeNull();
  });

  test("listens on MediaJel's hosts, for the ways a tag's traffic leaves a page", () => {
    expect(WIRE_URLS).toContain("*://*.cnna.io/*");
    expect(WIRE_TYPES).toEqual(["xmlhttprequest", "ping", "image", "script", "other"]);
  });
});

describe("how a request ended", () => {
  const ended = (fields: Record<string, unknown>) =>
    ({ requestId: "r-1", tabId: 7, frameId: 0, ...fields }) as chrome.webRequest.OnCompletedDetails;

  test("answered, refused, or never sent", () => {
    expect(outcomeOf(ended({ statusCode: 200, fromCache: false }))).toEqual({
      kind: "ok",
      status: 200,
      fromCache: false,
    });
    expect(outcomeOf(ended({ statusCode: 404, fromCache: false }))).toEqual({ kind: "failed", status: 404 });
    expect(outcomeOf(ended({ error: "net::ERR_BLOCKED_BY_CLIENT", fromCache: false }))).toEqual({
      kind: "blocked",
      error: "net::ERR_BLOCKED_BY_CLIENT",
    });
  });
});

describe("what a captured request said", () => {
  const captured = (url: string, body?: string) => ({
    tabId: 7,
    site: "unity-rd.com",
    request: "r-2",
    url,
    method: body === undefined ? "GET" : "POST",
    body,
    at: 1_758_294_000_000,
    pageKey: "doc-2",
  });

  test("a collector POST: its events, pending and placed, the tags it named and where it went", () => {
    const record = {
      schema: "iglu:com.snowplowanalytics.snowplow/unstruct_event/jsonschema/1-0-0",
      data: {
        schema: RECORD_SCHEMA,
        data: { appId: "acme", version: "2", collector: "//collector-azsx401.dmp.cnna.io" },
      },
    };
    const { events, appIds, collector, records } = heard(
      captured(COLLECTOR, batch({ e: "pv", aid: "acme" }, { e: "ue", aid: "acme", ue_pr: JSON.stringify(record) })),
    );
    expect(events.map((event) => [event.id, event.kind, event.outcome.kind])).toEqual([
      ["r-2:0", "page-view", "pending"],
      ["r-2:1", "self-describing", "pending"],
    ]);
    expect(events[0]).toMatchObject({ at: 1_758_294_000_000, request: "r-2", pageKey: "doc-2", appId: "acme" });
    expect(appIds).toEqual(["acme"]);
    expect(collector).toBe("collector-azsx401.dmp.cnna.io");
    expect(records).toEqual([events[1].record!]);
    expect(records[0]).toMatchObject({ appId: "acme", version: "2", collector: "collector-azsx401.dmp.cnna.io" });
  });

  test("a partner pixel and a custom-tag fetch carry no collector event — yet", () => {
    const dstillery = heard(
      captured(
        "https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=TerrabisMundelein-S3.PV&ncv=76",
      ),
    );
    expect(dstillery).toEqual({ events: [], appIds: [], collector: "", records: [] });
    expect(heard(captured("https://test-custom-tags.cnna.io/domains/dGVycmFiaXMuY28=.js"))).toEqual(dstillery);
  });
});
