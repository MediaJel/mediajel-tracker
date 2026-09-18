import { describe, expect, test } from "bun:test";

import { heardIn } from "~/background/beacons";
import { appIdsInBeacon } from "~/lib/beacons";

/**
 * A MediaJel tag names itself in every event it sends. These are the requests the tag actually
 * makes — captured from www.seedoflifelabs.com — and the ones that only look like them.
 */

const COLLECTOR = "https://collector-azsx401.dmp.cnna.io/analytics/track";

const batch = (...events: Record<string, unknown>[]): string =>
  JSON.stringify({ schema: "iglu:com.snowplowanalytics.snowplow/payload_data/jsonschema/1-0-4", data: events });

describe("appIdsInBeacon", () => {
  test("reads the app ID a tag's POSTed batch carries", () => {
    expect(
      appIdsInBeacon({ url: COLLECTOR, body: batch({ e: "pv", aid: "7bc01df0-c859-4392-b90d-a949e95dfe6f" }) }),
    ).toEqual(["7bc01df0-c859-4392-b90d-a949e95dfe6f"]);
  });

  test("names each tag once, however many of its events a batch holds", () => {
    const body = batch({ e: "pv", aid: "pageviews" }, { e: "pp", aid: "pageviews" }, { e: "ue", aid: "transactions" });
    expect(appIdsInBeacon({ url: COLLECTOR, body })).toEqual(["pageviews", "transactions"]);
  });

  test("reads a GET pixel's app ID from its query", () => {
    expect(appIdsInBeacon({ url: "https://collector.dmp.cnna.io/i?tv=js-2.14.0&e=pv&aid=legacy-tag" })).toEqual([
      "legacy-tag",
    ]);
  });

  test("a preflight, a tag file and anything that is not a Snowplow batch name no tag", () => {
    expect(appIdsInBeacon({ url: COLLECTOR })).toEqual([]);
    expect(appIdsInBeacon({ url: "https://tags.cnna.io/?appId=7bc01df0" })).toEqual([]);
    expect(appIdsInBeacon({ url: COLLECTOR, body: "not json" })).toEqual([]);
    expect(
      appIdsInBeacon({
        url: COLLECTOR,
        body: JSON.stringify({ schema: "iglu:com.example/other/jsonschema/1-0-0", data: [{ aid: "x" }] }),
      }),
    ).toEqual([]);
  });
});

describe("which requests are heard", () => {
  const request = (overrides: Partial<chrome.webRequest.OnBeforeRequestDetails>) =>
    ({
      tabId: 7,
      frameId: 0,
      initiator: "https://www.seedoflifelabs.com",
      url: COLLECTOR,
      method: "POST",
      requestBody: { raw: [{ bytes: new TextEncoder().encode(batch({ e: "pv", aid: "7bc01df0" })).buffer }] },
      ...overrides,
    }) as chrome.webRequest.OnBeforeRequestDetails;

  test("the tab's own page names its site and the tags it sent", () => {
    expect(heardIn(request({}))).toEqual({ site: "www.seedoflifelabs.com", appIds: ["7bc01df0"] });
  });

  test("an embedded frame on another host is not the tab's page", () => {
    expect(heardIn(request({ frameId: 4, initiator: "https://menu.example.com" }))).toBeNull();
  });

  test("a request from no tab, or from a page with no site, names nothing", () => {
    expect(heardIn(request({ tabId: -1 }))).toBeNull();
    expect(heardIn(request({ initiator: "null" }))).toBeNull();
  });
});
