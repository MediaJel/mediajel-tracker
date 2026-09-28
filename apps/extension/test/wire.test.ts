import { describe, expect, test } from "bun:test";

import { PendingEvent } from "@mediajel/assistant-core/wire/types";

import { WIRE_TYPES, WIRE_URLS, capturedFrom, heard, heardFromBridge, isWireUrl, outcomeOf } from "~/lib/wire";

/**
 * What the wire says, read off the details Chrome hands a `webRequest` listener. The requests are
 * the ones a MediaJel tag actually makes — captured from www.seedoflifelabs.com, unity-rd.com and
 * terrabis.co — and the ones that only look like them.
 */

const COLLECTOR = "https://collector-azsx401.dmp.cnna.io/analytics/track";
const RECORD_SCHEMA = "iglu:com.mediajel.events/record/jsonschema/1-0-2";
const AT = 1_758_294_000_000;

/** The row as the kind of event the test heard, so its own fields can be read. */
const asKind = <S extends PendingEvent["source"]>(
  event: PendingEvent,
  source: S,
): Extract<PendingEvent, { source: S }> => {
  if (event.source !== source) throw new Error(`Expected a ${source} row, got ${event.source}.`);
  return event as Extract<PendingEvent, { source: S }>;
};

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

  test("listens on MediaJel's hosts and the partners', for the ways a tag's traffic leaves a page", () => {
    expect(WIRE_URLS).toEqual([
      "*://*.cnna.io/*",
      "*://r.turn.com/*",
      "*://action.dstillery.com/*",
      "*://action.media6degrees.com/*",
      "*://tracking.lqm.io/*",
      "*://bat.bing.com/*",
    ]);
    expect(WIRE_TYPES).toEqual(["xmlhttprequest", "ping", "image", "script", "other"]);
  });

  test("knows which URLs those patterns cover, so the broad listener can leave them alone", () => {
    expect(isWireUrl(COLLECTOR)).toBe(true);
    expect(isWireUrl("https://cnna.io/")).toBe(true);
    expect(isWireUrl("https://action.media6degrees.com/orbserv/nsjs?nc=x")).toBe(true);
    expect(isWireUrl("https://col.surfside.io/i?tv=js-3.1.0")).toBe(false);
    expect(isWireUrl("https://notcnna.io/")).toBe(false);
    expect(isWireUrl("https://turn.com/r/beacon")).toBe(false);
    expect(isWireUrl("not a url")).toBe(false);
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

  test("sent on to another URL — the Dstillery pixel on its way to media6degrees — is answered", () => {
    const redirect = {
      requestId: "r-1",
      tabId: 7,
      frameId: 0,
      statusCode: 302,
      fromCache: false,
      redirectUrl: "https://action.media6degrees.com/orbserv/nsjs?nc=x",
    } as chrome.webRequest.OnBeforeRedirectDetails;
    expect(outcomeOf(redirect)).toEqual({ kind: "ok", status: 302, fromCache: false });
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
    at: AT,
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
    expect(events.map((event) => [event.id, asKind(event, "collector").kind, event.outcome.kind])).toEqual([
      [`r-2:0:${AT}`, "page-view", "pending"],
      [`r-2:1:${AT}`, "self-describing", "pending"],
    ]);
    expect(events[0]).toMatchObject({ at: AT, request: "r-2", pageKey: "doc-2", appId: "acme" });
    expect(appIds).toEqual(["acme"]);
    expect(collector).toBe("collector-azsx401.dmp.cnna.io");
    expect(records).toEqual([asKind(events[1], "collector").record!]);
    expect(records[0]).toMatchObject({ appId: "acme", version: "2", collector: "collector-azsx401.dmp.cnna.io" });
  });

  test("a partner pixel is one row, naming its purpose and segment; it names no tag and nothing about the collector", () => {
    const { events, appIds, collector, records } = heard(
      captured(
        "https://action.dstillery.com/orbserv/nsjs?adv=cl172365597545365&ns=8779&nc=TerrabisMundelein-S3.PV&ncv=76",
      ),
    );
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      id: `r-2:0:${AT}`,
      request: "r-2",
      pageKey: "doc-2",
      outcome: { kind: "pending" },
      source: "partner",
      partner: "dstillery",
      purpose: "audience",
      segment: "TerrabisMundelein-S3.PV",
      appId: "",
    });
    expect({ appIds, collector, records }).toEqual({ appIds: [], collector: "", records: [] });
  });

  test("a custom-tag fetch is one row named for what it loads; an app-id file names the tag without saying it is sending", () => {
    const domain = heard(captured("https://test-custom-tags.cnna.io/domains/dGVycmFiaXMuY28=.js"));
    expect(domain.events).toHaveLength(1);
    expect(domain.events[0]).toMatchObject({ source: "custom-tag", scope: "domain", name: "terrabis.co", appId: "" });

    const appId = heard(captured(`https://test-custom-tags.cnna.io/app-ids/${btoa("acme")}.js`));
    expect(appId.events[0]).toMatchObject({ source: "custom-tag", scope: "app-id", name: "acme", appId: "acme" });
    expect(appId.appIds).toEqual([]);
  });

  test("another vendor's tracker on any other host is a foreign row; on a MediaJel host it never is", () => {
    const surfside = heard(captured("https://col.surfside.io/i?tna=surf&p=mob&e=ue&tv=js-3.1.0&ue_px=eyJ4IjoxfQ"));
    expect(surfside.events).toHaveLength(1);
    expect(surfside.events[0]).toMatchObject({
      source: "foreign",
      collector: "col.surfside.io",
      kind: "self-describing",
      tracker: "surf",
      version: "js-3.1.0",
      appId: "",
    });
    expect(surfside.appIds).toEqual([]);

    const ours = heard(captured("https://collector.dmp.cnna.io/i?tv=js-2.14.0&e=pv&aid=legacy-tag"));
    expect(ours.events.map((event) => event.source)).toEqual(["collector"]);
    expect(ours.appIds).toEqual(["legacy-tag"]);
  });

  test("a request that is nothing the ledger keeps — the tag file, an ad pixel — is no row at all", () => {
    expect(heard(captured("https://tags.cnna.io/index.js?appId=acme"))).toEqual({
      events: [],
      appIds: [],
      collector: "",
      records: [],
    });
    expect(heard(captured("https://match.adsrvr.org/track/cmf/generic?ttd_pid=x")).events).toEqual([]);
  });
});

describe("what the page's bridge said about third-party tags", () => {
  test("a registration is on record the moment it is made; a fire waits for its outcome", () => {
    const registered = heardFromBridge(
      {
        type: "third-party-registered",
        key: "tp:m1:1",
        pageUrl: "https://unity-rd.com/checkout",
        triggers: [{ trigger: "onTransaction", count: 1, hosts: ["pixel.example"] }],
      },
      "doc-2",
      AT,
    );
    expect(registered).toEqual({
      id: "tp:m1:1",
      at: AT,
      request: "tp:m1:1",
      pageKey: "doc-2",
      pageUrl: "https://unity-rd.com/checkout",
      appId: "",
      outcome: { kind: "ok", status: 0, fromCache: false },
      source: "third-party",
      phase: "registered",
      triggers: [{ trigger: "onTransaction", count: 1, hosts: ["pixel.example"] }],
    });

    const fired = heardFromBridge(
      {
        type: "third-party-fired",
        key: "tp:m1:2",
        pageUrl: "https://unity-rd.com/thank-you",
        trigger: "onTransaction",
        element: "image",
        host: "pixel.example",
        url: "https://pixel.example/conv?order=T4821",
      },
      "doc-3",
      AT + 1,
    );
    expect(fired).toEqual({
      id: "tp:m1:2",
      at: AT + 1,
      request: "tp:m1:2",
      pageKey: "doc-3",
      pageUrl: "https://unity-rd.com/thank-you",
      appId: "",
      outcome: { kind: "pending" },
      source: "third-party",
      phase: "fired",
      trigger: "onTransaction",
      element: "image",
      host: "pixel.example",
      url: "https://pixel.example/conv?order=T4821",
    });
  });
});
