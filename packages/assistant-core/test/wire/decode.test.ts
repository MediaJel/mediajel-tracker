import { describe, expect, test } from "bun:test";

import { decodeCollectorRequest } from "@mediajel/assistant-core/wire/decode";

import { APP_ID, COLLECTOR_URL, PAGE_VIEW, RECORD, RECORD_SCHEMA, b64url, batch, contexts, unstruct } from "./fixtures";

/**
 * What a collector request says, read the way the tracker wrote it. The requests are the ones a
 * MediaJel tag actually makes — unity-rd.com's v1 batch — and the ones that only look like them.
 */

const WEB_PAGE = { schema: "iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0", data: { id: "p-1" } };
const LINK_CLICK = "iglu:com.snowplowanalytics.snowplow/link_click/jsonschema/1-0-1";

const decode = (body?: string, url = COLLECTOR_URL) => decodeCollectorRequest({ url, body });

/** The app IDs a request names, once each — what the tag detection reads off the wire. */
const appIds = (request: { url: string; body?: string }): string[] => [
  ...new Set(decodeCollectorRequest(request).map((event) => event.appId)),
];

describe("decoding the unity-rd batch", () => {
  const [pageView, record] = decode(batch(PAGE_VIEW, RECORD));

  test("a page view and the tag's record event, in the order sent, each placed in its batch", () => {
    expect(pageView).toMatchObject({
      source: "collector",
      transport: "post",
      collector: "collector-azsx401.dmp.cnna.io",
      kind: "page-view",
      code: "pv",
      name: "Page view",
      appId: APP_ID,
      pageUrl: "https://unity-rd.com/",
      batch: { index: 0, size: 2 },
    });
    expect(pageView.schema).toBeUndefined();
    expect(record).toMatchObject({
      kind: "self-describing",
      code: "ue",
      name: "record",
      schema: RECORD_SCHEMA,
      appId: APP_ID,
      batch: { index: 1, size: 2 },
    });
    expect(JSON.parse(record.payload!)).toMatchObject({ appId: APP_ID, environment: "dutchie-subdomain" });
  });

  test("the record event carries the tag's configuration, lifted off the wire", () => {
    expect(record.record).toMatchObject({
      appId: APP_ID,
      version: "1",
      environment: "dutchie-subdomain",
      collector: "collector-azsx401.dmp.cnna.io",
      config: { params: { segmentId: "e-oqTEY2SNGlRzvmH9esjw" }, source: "record" },
    });
    expect(pageView.record).toBeUndefined();
  });

  test("every field sits in its group under our label, in protocol order; the consumed keys are never listed", () => {
    expect(pageView.groups.map((group) => group.group)).toEqual([
      "event",
      "app",
      "user",
      "session",
      "page",
      "browser",
      "device",
    ]);
    const browser = pageView.groups.find((group) => group.group === "browser")!;
    expect(browser.label).toBe("Browser");
    expect(browser.fields).toContainEqual({ key: "f_pdf", label: "PDF plugin", value: "1" });
    expect(browser.fields).toContainEqual({ key: "lang", label: "Language", value: "en-US" });
    const keys = record.groups.flatMap((group) => group.fields.map((field) => field.key));
    expect(keys).not.toContain("ue_px");
    expect(keys).toContain("aid");
  });

  test("a key the protocol does not name goes under Other, as itself", () => {
    const [event] = decode(batch({ ...PAGE_VIEW, xyz: "1", nested: { a: 1 } }));
    const other = event.groups.find((group) => group.group === "other")!;
    expect(other.fields).toEqual([
      { key: "xyz", label: "xyz", value: "1" },
      { key: "nested", label: "nested", value: '{"a":1}' },
    ]);
  });
});

describe("the self-describing event and the entities", () => {
  test("reads the event from ue_pr as from ue_px, and the entities from co as from cx", () => {
    const click = unstruct(LINK_CLICK, { targetUrl: "https://unity-rd.com/menu" });
    const plain = decode(batch({ e: "ue", ue_pr: JSON.stringify(click), co: JSON.stringify(contexts(WEB_PAGE)) }));
    const encoded = decode(batch({ e: "ue", ue_px: b64url(click), cx: b64url(contexts(WEB_PAGE)) }));

    for (const [event] of [plain, encoded]) {
      expect(event).toMatchObject({ name: "link_click", schema: LINK_CLICK });
      expect(JSON.parse(event.payload!)).toEqual({ targetUrl: "https://unity-rd.com/menu" });
      expect(event.entities).toEqual([
        {
          schema: WEB_PAGE.schema,
          vendor: "com.snowplowanalytics.snowplow",
          name: "web_page",
          version: "1-0-0",
          data: '{"id":"p-1"}',
          truncated: false,
        },
      ]);
    }
  });

  test("base64url's -/_ alphabet, missing padding and UTF-8 all read back; anything else reads as no inner event", () => {
    const data = { note: "café — 10€ ?>>>???", ok: true };
    const encoded = b64url(unstruct(LINK_CLICK, data));
    expect(encoded).not.toMatch(/[+/=]/);
    const [event] = decode(batch({ e: "ue", ue_px: encoded }));
    expect(JSON.parse(event.payload!)).toEqual(data);

    const [broken] = decode(batch({ e: "ue", ue_px: "%%%not base64%%%" }));
    expect(broken).toMatchObject({ kind: "self-describing", name: "Self-describing event" });
    expect(broken.schema).toBeUndefined();
    expect(broken.payload).toBeUndefined();
  });

  test("a wrapper that is not unstruct_event, or not contexts, yields no event and no entities", () => {
    const [event] = decode(
      batch({
        e: "ue",
        ue_pr: JSON.stringify({ schema: LINK_CLICK, data: {} }),
        co: JSON.stringify({ schema: WEB_PAGE.schema, data: [WEB_PAGE] }),
      }),
    );
    expect(event.name).toBe("Self-describing event");
    expect(event.entities).toEqual([]);

    const [malformed] = decode(batch({ e: "ue", ue_pr: "{not json", cx: b64url({ data: [WEB_PAGE] }) }));
    expect(malformed.schema).toBeUndefined();
    expect(malformed.entities).toEqual([]);
  });

  test("a sign-up's data is masked before it is kept", () => {
    const signUp = unstruct("iglu:com.mediajel.events/sign_up/jsonschema/1-0-0", {
      emailAddress: "jane.doe@example.com",
      phoneNumber: "555-123-4567",
      firstName: "Jane",
      advertiser: "Unity Rd.",
    });
    const [event] = decode(batch({ e: "ue", ue_px: b64url(signUp) }));
    expect(event.name).toBe("sign_up");
    expect(event.payload).not.toContain("jane.doe@example.com");
    expect(event.payload).not.toContain("555-123-4567");
    expect(JSON.parse(event.payload!)).toMatchObject({ firstName: "Jane", advertiser: "Unity Rd." });
  });
});

describe("which requests carry events", () => {
  test("names each tag once, however many of its events a batch holds", () => {
    const body = batch({ e: "pv", aid: "pageviews" }, { e: "pp", aid: "pageviews" }, { e: "ue", aid: "transactions" });
    expect(appIds({ url: COLLECTOR_URL, body })).toEqual(["pageviews", "transactions"]);
    expect(decode(body).map((event) => event.kind)).toEqual(["page-view", "page-ping", "self-describing"]);
  });

  test("reads a GET pixel's fields from its query", () => {
    const [event] = decode(undefined, "https://collector.dmp.cnna.io/i?tv=js-2.14.0&e=pv&aid=legacy-tag");
    expect(event).toMatchObject({
      transport: "get",
      kind: "page-view",
      appId: "legacy-tag",
      collector: "collector.dmp.cnna.io",
    });
  });

  test("a preflight, a tag file and anything that is not a Snowplow batch carry no event", () => {
    expect(decode(undefined)).toEqual([]);
    expect(decode(undefined, "https://tags.cnna.io/?appId=7bc01df0")).toEqual([]);
    expect(decode("not json")).toEqual([]);
    expect(decode(JSON.stringify({ schema: "iglu:com.example/other/jsonschema/1-0-0", data: [{ aid: "x" }] }))).toEqual(
      [],
    );
    expect(decode(batch(), "not a url")).toEqual([]);
  });

  test("an event whose kind this build does not know is still a row", () => {
    const [event] = decode(batch({ e: "xx", aid: "x" }));
    expect(event).toMatchObject({ kind: "unknown", code: "xx", name: "Event" });
    const [nameless] = decode(batch({ aid: "x" }));
    expect(nameless).toMatchObject({ kind: "unknown", code: "", appId: "x", pageUrl: "" });
  });
});
