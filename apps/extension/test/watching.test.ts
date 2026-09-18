import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { Outcome } from "@mediajel/assistant-core/wire/types";

import { panelRegistry } from "~/background/panels";
import { listenAbroad } from "~/background/wire";
import { Captured } from "~/lib/wire";

/**
 * Other vendors' trackers are heard only while a panel is open: the registry says when the first
 * panel opens and the last one closes, and the broad listener is added and removed on exactly
 * those two moments — by reference, so nothing else on `webRequest` is touched.
 */

const port = (): chrome.runtime.Port => ({ postMessage: () => undefined }) as unknown as chrome.runtime.Port;

const failing = (): chrome.runtime.Port =>
  ({
    postMessage: () => {
      throw new Error("Attempting to use a disconnected port object");
    },
  }) as unknown as chrome.runtime.Port;

describe("the panels open on this worker's tabs", () => {
  test("says when the first panel opens and when the last one closes, and nothing in between", () => {
    const crossed: string[] = [];
    const panels = panelRegistry(
      () => crossed.push("first"),
      () => crossed.push("last"),
    );
    const [a, b] = [port(), port()];
    panels.bind(7, a);
    panels.bind(8, b);
    expect(crossed).toEqual(["first"]);
    expect([panels.watching(7), panels.watching(8), panels.watching(9)]).toEqual([true, true, false]);

    panels.unbind(7, a);
    expect(crossed).toEqual(["first"]);
    panels.unbind(8, b);
    expect(crossed).toEqual(["first", "last"]);
    expect(panels.watching(8)).toBe(false);

    panels.bind(7, port());
    expect(crossed).toEqual(["first", "last", "first"]);
  });

  test("a port replaced by a newer one on the same tab does not close the tab's panel when it goes", () => {
    const crossed: string[] = [];
    const panels = panelRegistry(
      () => crossed.push("first"),
      () => crossed.push("last"),
    );
    const [old, fresh] = [port(), port()];
    panels.bind(7, old);
    panels.bind(7, fresh);
    panels.unbind(7, old);
    expect(panels.watching(7)).toBe(true);
    expect(crossed).toEqual(["first"]);
    panels.unbind(7, fresh);
    expect(crossed).toEqual(["first", "last"]);
  });

  test("a port that fails on send is forgotten, and counts as closed", () => {
    const crossed: string[] = [];
    const panels = panelRegistry(
      () => crossed.push("first"),
      () => crossed.push("last"),
    );
    panels.bind(7, failing());
    panels.send(7, { type: "session" });
    expect(panels.watching(7)).toBe(false);
    expect(crossed).toEqual(["first", "last"]);
    // A tab with no panel is simply not sent to.
    expect(() => panels.send(9, { type: "session" })).not.toThrow();
  });
});

/** A `webRequest` event that keeps its listeners by reference, as Chrome does. */
interface FakeEvent {
  listeners: Set<(...args: unknown[]) => unknown>;
  filters: unknown[];
  extras: unknown[];
  addListener(listener: (...args: unknown[]) => unknown, filter: unknown, extra?: unknown): void;
  removeListener(listener: (...args: unknown[]) => unknown): void;
}

const fakeEvent = (): FakeEvent => {
  const listeners = new Set<(...args: unknown[]) => unknown>();
  const filters: unknown[] = [];
  const extras: unknown[] = [];
  return {
    listeners,
    filters,
    extras,
    addListener: (listener, filter, extra) => {
      listeners.add(listener);
      filters.push(filter);
      extras.push(extra);
    },
    removeListener: (listener) => {
      listeners.delete(listener);
    },
  };
};

describe("hearing other vendors' trackers", () => {
  const chromeApi = globalThis as unknown as { chrome: { webRequest: unknown } };
  const original = chromeApi.chrome.webRequest;
  let events: { onBeforeRequest: FakeEvent; onCompleted: FakeEvent; onErrorOccurred: FakeEvent };

  beforeEach(() => {
    events = { onBeforeRequest: fakeEvent(), onCompleted: fakeEvent(), onErrorOccurred: fakeEvent() };
    chromeApi.chrome.webRequest = events;
  });

  afterEach(() => {
    chromeApi.chrome.webRequest = original;
  });

  const request = (tabId: number, url: string) =>
    ({
      requestId: "r-9",
      tabId,
      frameId: 0,
      initiator: "https://unity-rd.com",
      documentId: "doc-9",
      url,
      method: "GET",
      type: "image",
      timeStamp: 1_758_294_000_000,
    }) as chrome.webRequest.OnBeforeRequestDetails;

  const ended = (tabId: number, url: string) =>
    ({
      requestId: "r-9",
      tabId,
      frameId: 0,
      url,
      statusCode: 200,
      fromCache: false,
    }) as chrome.webRequest.OnCompletedDetails;

  test("registers on every URL for the watched tabs, and removes exactly what it registered", () => {
    const stop = listenAbroad(
      () => true,
      () => undefined,
      () => undefined,
    );
    expect(events.onBeforeRequest.listeners.size).toBe(1);
    expect(events.onBeforeRequest.filters).toEqual([
      { urls: ["<all_urls>"], types: ["xmlhttprequest", "ping", "image", "script", "other"] },
    ]);
    expect(events.onBeforeRequest.extras).toEqual([["requestBody"]]);
    expect(events.onCompleted.listeners.size).toBe(1);
    expect(events.onErrorOccurred.listeners.size).toBe(1);

    stop();
    expect(events.onBeforeRequest.listeners.size).toBe(0);
    expect(events.onCompleted.listeners.size).toBe(0);
    expect(events.onErrorOccurred.listeners.size).toBe(0);
  });

  test("hears a tracker on a watched tab, not on an unwatched one, and never a request the narrow listeners hear", () => {
    const heard: Captured[] = [];
    const outcomes: [number, string, Outcome][] = [];
    listenAbroad(
      (tabId) => tabId === 7,
      (captured) => heard.push(captured),
      (tabId, id, outcome) => outcomes.push([tabId, id, outcome]),
    );
    const [hear] = events.onBeforeRequest.listeners;
    const [settle] = events.onCompleted.listeners;
    const surfside = "https://col.surfside.io/i?tna=surf&e=pv&tv=js-3.1.0";

    hear(request(7, surfside));
    hear(request(8, surfside));
    hear(request(7, "https://collector-azsx401.dmp.cnna.io/analytics/track"));
    hear(request(7, "https://action.dstillery.com/orbserv/nsjs?nc=00000"));
    expect(heard.map((captured) => [captured.tabId, captured.url])).toEqual([[7, surfside]]);

    settle(ended(7, surfside));
    settle(ended(8, surfside));
    settle(ended(7, "https://collector-azsx401.dmp.cnna.io/analytics/track"));
    expect(outcomes).toEqual([[7, "r-9", { kind: "ok", status: 200, fromCache: false }]]);
  });
});
