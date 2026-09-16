import { describe, expect, test } from "bun:test";

import { hear, heardTags } from "~/background/beacons";
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

describe("what a tab has been heard sending", () => {
  test("is kept per tab and per site, so another site's tags never show on this one", async () => {
    await hear(101, "www.seedoflifelabs.com", ["7bc01df0"]);

    expect(await heardTags(101, "www.seedoflifelabs.com")).toEqual(["7bc01df0"]);
    expect(await heardTags(101, "www.binoidcbd.com")).toEqual([]);
    expect(await heardTags(102, "www.seedoflifelabs.com")).toEqual([]);
  });

  test("reports only news — a tag heard again on every page ping changes nothing", async () => {
    expect(await hear(103, "shop.example.com", ["pageviews"])).toEqual(["pageviews"]);
    expect(await hear(103, "shop.example.com", ["pageviews"])).toBeNull();
    expect(await hear(103, "shop.example.com", ["pageviews", "transactions"])).toEqual(["pageviews", "transactions"]);
  });

  test("keeps both of two beacons that land together", async () => {
    await Promise.all([hear(104, "shop.example.com", ["first"]), hear(104, "shop.example.com", ["second"])]);
    expect(await heardTags(104, "shop.example.com")).toEqual(["first", "second"]);
  });
});
