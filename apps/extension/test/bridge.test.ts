import { describe, expect, test } from "bun:test";

import { TrackerStatus } from "@mediajel/assistant-core/recorder/context";

import { BridgeUp, unwrap, wrap } from "~/bridge/protocol";
import { siteOf } from "~/lib/site";
import { tagsOf } from "~/lib/status";

/**
 * The wire between the page and the extension, and the one value that decides which job a
 * recording belongs to. Both are small; both are load-bearing enough that getting them wrong
 * would be silent.
 */

const messageEvent = (data: unknown, source: unknown = globalThis.window): MessageEvent =>
  ({ data, source }) as MessageEvent;

describe("the postMessage envelope", () => {
  test("a message sent up is read as up, and not as down", () => {
    const payload: BridgeUp = { type: "ready" };
    const wire = wrap("up", payload);

    expect(unwrap<BridgeUp>(messageEvent(wire), "up")).toEqual(payload);
    expect(unwrap<BridgeUp>(messageEvent(wire), "down")).toBeNull();
  });

  test("ignores anything from another window — an iframe cannot feed the recording", () => {
    const wire = wrap("up", { type: "ready" });
    expect(unwrap(messageEvent(wire, { other: true }), "up")).toBeNull();
  });

  test("ignores the page's own postMessage traffic", () => {
    for (const data of [null, undefined, "a string", 42, { hello: "world" }, { __mj: "something else" }]) {
      expect(unwrap(messageEvent(data), "up")).toBeNull();
    }
  });

  test("carries the __mj key the recorder's postMessage source already skips, so the bridge never records itself", () => {
    expect(Object.keys(wrap("up", { type: "ready" }))).toContain("__mj");
  });
});

describe("siteOf", () => {
  test("a job is identified by hostname — the same string the deploy file is named after", () => {
    expect(siteOf("https://shop.example.com/checkout?step=2")).toBe("shop.example.com");
    expect(siteOf("http://localhost:1234/")).toBe("localhost");
  });

  test("anything that is not an http(s) page has no job", () => {
    for (const url of [
      "chrome://extensions",
      "chrome-extension://abc/sidepanel.html",
      "about:blank",
      "file:///Users/x/index.html",
      "",
      "not a url",
    ]) {
      expect(siteOf(url)).toBeNull();
    }
  });
});

describe("tagsOf", () => {
  /** What a page bridge built before `tags` existed sends: the rest of a status, and no `tags` key. */
  const older = (fields: Partial<TrackerStatus>): TrackerStatus =>
    ({ appId: "", environment: "", version: "", ...fields }) as TrackerStatus;

  test("reads the tags a current page bridge reports", () => {
    const tags = [
      { appId: "pageviews", environment: "weave", version: "2", delayed: true },
      { appId: "transactions", environment: "weave", version: "2", delayed: false },
    ];
    expect(tagsOf(older({ appId: "pageviews", tags }))).toEqual(tags);
  });

  test("a page bridge older than the panel reports one appId and no tags — that is still one tag, not a crash", () => {
    expect(tagsOf(older({ appId: "acme", environment: "production", version: "2" }))).toEqual([
      { appId: "acme", environment: "production", version: "2", delayed: false },
    ]);
  });

  test("an older page bridge with no tag on its page has no tags", () => {
    expect(tagsOf(older({}))).toEqual([]);
  });
});
