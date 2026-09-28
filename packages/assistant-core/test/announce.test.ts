import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { QueryStringContext } from "@mediajel/tracker-core/types";
import {
  MediaJelRegistry,
  TAG_EVENT,
  TagAnnouncement,
  TagState,
  announceTag,
  isRegistry,
} from "@mediajel/tracker-core/utils/announce";

/**
 * The tag's announcement of itself is what the assistant will read a page's tags from, so the
 * registry it keeps on `window.MediaJel` and the event it dispatches are pinned down here: one
 * frozen record per app ID that only moves forward, with the script URL from the first word.
 */

const page = window as unknown as { MediaJel?: unknown };

const context = (appId: string, extra: Partial<QueryStringContext> = {}): QueryStringContext =>
  ({
    appId,
    environment: "jane",
    version: "1",
    event: "transaction",
    collector: "https://collector.test",
    ...extra,
  }) as QueryStringContext;

const registry = (): MediaJelRegistry => {
  if (!isRegistry(page.MediaJel)) throw new Error("window.MediaJel is not a registry");
  return page.MediaJel;
};

const states = (): TagState[] => registry().tags.map((tag) => tag.state);

const listeners: ((event: Event) => void)[] = [];

/** Collects the events the page hears from now on, as they come. */
const listen = (): CustomEvent<TagAnnouncement>[] => {
  const seen: CustomEvent<TagAnnouncement>[] = [];
  const listener = (event: Event): void => {
    seen.push(event as CustomEvent<TagAnnouncement>);
  };
  window.addEventListener(TAG_EVENT, listener);
  listeners.push(listener);
  return seen;
};

beforeEach(() => {
  delete page.MediaJel;
});

afterEach(() => {
  listeners.splice(0).forEach((listener) => window.removeEventListener(TAG_EVENT, listener));
});

describe("announceTag", () => {
  test("the first announcement sets up window.MediaJel and records the tag as its URL describes it", () => {
    expect(page.MediaJel).toBeUndefined();
    const before = Date.now();

    announceTag(context("acme", { enable: "true" }), "installed");

    expect(isRegistry(page.MediaJel)).toBe(true);
    expect(registry().v).toBe(1);
    const [entry] = registry().tags;
    expect(entry).toEqual({
      v: 1,
      appId: "acme",
      environment: "jane",
      version: "1",
      event: "transaction",
      collector: "https://collector.test",
      enable: true,
      src: "",
      state: "installed",
      at: entry.at,
    });
    expect(entry.at).toBeGreaterThanOrEqual(before);
    expect("error" in entry).toBe(false);
  });

  test("reads absent fields as empty, and enable=false as switched off", () => {
    announceTag({ appId: "bare" } as QueryStringContext, "installed");
    announceTag(context("off", { enable: "false" }), "disabled");

    expect(registry().tags[0]).toMatchObject({ appId: "bare", environment: "", version: "", event: "", collector: "" });
    expect(registry().tags[0].enable).toBe(true);
    expect(registry().tags[1]).toMatchObject({ appId: "off", state: "disabled", enable: false });
  });

  test("keeps one record per app ID, in the order the tags first spoke", () => {
    announceTag(context("acme"), "installed");
    announceTag(context("other"), "installed");
    announceTag(context("acme"), "running");

    expect(registry().tags.map((tag) => [tag.appId, tag.state])).toEqual([
      ["acme", "running"],
      ["other", "installed"],
    ]);
  });

  test("a record only moves forward: a lower rank is ignored, an equal or higher one replaces it", () => {
    const acme = context("acme");
    announceTag(acme, "installed");
    const installed = registry().tags[0];

    announceTag(acme, "installed");
    expect(registry().tags[0]).not.toBe(installed);
    expect(states()).toEqual(["installed"]);

    announceTag(acme, "running");
    expect(states()).toEqual(["running"]);

    announceTag(acme, "failed", "boom");
    announceTag(acme, "installed");
    expect(states()).toEqual(["running"]);
    expect(registry().tags[0].error).toBeUndefined();

    const other = context("other");
    announceTag(other, "opted-out");
    announceTag(other, "disabled");
    expect(states()).toEqual(["running", "disabled"]);
    announceTag(other, "failed", "boom");
    expect(registry().tags[1]).toMatchObject({ state: "failed", error: "boom" });
    announceTag(other, "installed");
    expect(states()).toEqual(["running", "failed"]);
  });

  test("keeps the script URL from the first announcement, the only one made while the script runs", () => {
    const src = "https://tags.cnna.io/?appId=acme&environment=jane";
    const script = document.createElement("script");
    script.setAttribute("src", src);
    Object.defineProperty(document, "currentScript", { value: script, configurable: true });
    try {
      announceTag(context("acme"), "installed");
    } finally {
      delete (document as { currentScript?: unknown }).currentScript;
    }
    expect(document.currentScript).toBeNull();

    announceTag(context("acme"), "running");

    expect(registry().tags[0]).toMatchObject({ state: "running", src });
  });

  test("every record is frozen", () => {
    announceTag(context("acme"), "installed");
    const [entry] = registry().tags;

    expect(Object.isFrozen(entry)).toBe(true);
    expect(() => {
      (entry as { state: TagState }).state = "running";
    }).toThrow();
    expect(entry.state).toBe("installed");
  });

  test("dispatches mediajel:tag on window with the record itself as detail, once per accepted announcement", () => {
    const seen = listen();
    const acme = context("acme");

    announceTag(acme, "installed");
    announceTag(acme, "running");
    announceTag(acme, "installed");

    expect(seen).toHaveLength(2);
    expect(seen[0].type).toBe(TAG_EVENT);
    expect(seen[0].bubbles).toBe(false);
    expect(seen[0].detail).toMatchObject({ appId: "acme", state: "installed" });
    expect(seen[1].detail).toBe(registry().tags[0]);
    expect(seen[1].detail.state).toBe("running");
  });

  test("leaves a window.MediaJel that is not a registry exactly as it is, and still speaks", () => {
    const theirs = { theirs: true };
    page.MediaJel = theirs;
    const seen = listen();

    announceTag(context("foreign-one"), "installed");
    announceTag(context("foreign-one"), "running");

    expect(page.MediaJel).toBe(theirs);
    expect(theirs).toEqual({ theirs: true });
    expect(seen.map((event) => event.detail.state)).toEqual(["installed", "running"]);
  });

  test("a null window.MediaJel is the page's too", () => {
    page.MediaJel = null;
    const seen = listen();

    announceTag(context("foreign-two"), "installed");

    expect(page.MediaJel).toBeNull();
    expect(seen.map((event) => event.detail.appId)).toEqual(["foreign-two"]);
  });

  test("announces to a later build's registry rather than replacing it", () => {
    const received: TagAnnouncement[] = [];
    const newer = { v: 2, tags: [], announce: (tag: TagAnnouncement) => received.push(tag) };
    page.MediaJel = newer;
    const seen = listen();

    announceTag(context("acme"), "installed");

    expect(page.MediaJel).toBe(newer);
    expect(received.map((tag) => [tag.appId, tag.state])).toEqual([["acme", "installed"]]);
    expect(seen).toHaveLength(0);
  });

  test("does not throw when the page has no CustomEvent constructor", () => {
    const saved = globalThis.CustomEvent;
    Object.defineProperty(globalThis, "CustomEvent", { value: undefined, configurable: true, writable: true });
    try {
      expect(() => announceTag(context("acme"), "installed")).not.toThrow();
      expect(states()).toEqual(["installed"]);
    } finally {
      Object.defineProperty(globalThis, "CustomEvent", { value: saved, configurable: true, writable: true });
    }
  });
});

describe("isRegistry", () => {
  test("wants announce as a function and v as a number, whatever else is there", () => {
    expect(isRegistry({ v: 1, tags: [], announce: () => {} })).toBe(true);
    expect(isRegistry({ v: 2, announce: () => {} })).toBe(true);
    expect(isRegistry({ v: "1", tags: [], announce: () => {} })).toBe(false);
    expect(isRegistry({ v: 1, tags: [] })).toBe(false);
    expect(isRegistry({ theirs: true })).toBe(false);
    expect(isRegistry(null)).toBe(false);
    expect(isRegistry(undefined)).toBe(false);
    expect(isRegistry("MediaJel")).toBe(false);
  });

  test("says no, rather than throwing, about an object that throws when read", () => {
    const hostile = new Proxy(
      {},
      {
        get: () => {
          throw new Error("no");
        },
      },
    );
    expect(isRegistry(hostile)).toBe(false);
  });
});
