import { describe, expect, test } from "bun:test";

import { BridgeUp, unwrap, wrap } from "~/bridge/protocol";
import { siteOf } from "~/lib/site";

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
