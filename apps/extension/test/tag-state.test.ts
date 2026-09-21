import { beforeEach, describe, expect, test } from "bun:test";

import { forgetTab, learn, tagsOfTab } from "~/background/tag-state";
import { clearExtensionStorage } from "./setup";

/**
 * The owner of what is known about each tab's tags, in session storage: per tab and per site,
 * news and only news, and two pieces of evidence landing together never lose one another.
 */

beforeEach(() => clearExtensionStorage());

describe("what is known about a tab", () => {
  test("is kept per tab and per site, so another site's tags never show on this one", async () => {
    await learn(101, "www.seedoflifelabs.com", { kind: "beacon", appIds: ["7bc01df0"] });

    expect((await tagsOfTab(101, "www.seedoflifelabs.com")).tags.map((tag) => tag.appId)).toEqual(["7bc01df0"]);
    expect((await tagsOfTab(101, "www.binoidcbd.com")).tags).toEqual([]);
    expect((await tagsOfTab(102, "www.seedoflifelabs.com")).tags).toEqual([]);
  });

  test("answers only news — a tag heard again on every page ping changes nothing", async () => {
    expect((await learn(103, "shop.example.com", { kind: "beacon", appIds: ["pageviews"] }))?.tags).toHaveLength(1);
    expect(await learn(103, "shop.example.com", { kind: "beacon", appIds: ["pageviews"] })).toBeNull();
    expect((await learn(103, "shop.example.com", { kind: "beacon", appIds: ["transactions"] }))?.tags).toHaveLength(2);
  });

  test("keeps both of two pieces of evidence that land together", async () => {
    await Promise.all([
      learn(104, "shop.example.com", { kind: "beacon", appIds: ["first"] }),
      learn(104, "shop.example.com", { kind: "running", appIds: ["second"] }),
    ]);
    expect((await tagsOfTab(104, "shop.example.com")).tags.map((tag) => tag.appId)).toEqual(["first", "second"]);
  });

  test("a tab that moved to another site starts over, and a closed tab is forgotten", async () => {
    await learn(105, "first.example.com", { kind: "beacon", appIds: ["a"] });
    await learn(105, "second.example.com", { kind: "settled" });
    expect(await tagsOfTab(105, "second.example.com")).toMatchObject({ settled: true, tags: [] });

    await forgetTab(105);
    expect((await tagsOfTab(105, "second.example.com")).settled).toBe(false);
  });
});
