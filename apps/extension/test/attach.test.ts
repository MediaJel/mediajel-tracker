import { afterEach, describe, expect, test } from "bun:test";

import { attach, attachAll, bridgeFiles } from "~/background/attach";

/**
 * Attaching to tabs that were open before the extension was: the right files, in the right order,
 * into the right world, and one tab that refuses never stops the others.
 */

type Injection = { target: { tabId: number }; files: string[]; world?: string };

const chromeApi = (): {
  scripting: Record<string, unknown>;
  tabs: Record<string, unknown>;
  runtime: Record<string, unknown>;
} =>
  (
    globalThis as unknown as {
      chrome: { scripting: Record<string, unknown>; tabs: Record<string, unknown>; runtime: Record<string, unknown> };
    }
  ).chrome;

const original = {
  executeScript: chromeApi().scripting.executeScript,
  getRegistered: chromeApi().scripting.getRegisteredContentScripts,
  query: chromeApi().tabs.query,
  getManifest: chromeApi().runtime.getManifest,
};

afterEach(() => {
  chromeApi().scripting.executeScript = original.executeScript;
  chromeApi().scripting.getRegisteredContentScripts = original.getRegistered;
  chromeApi().tabs.query = original.query;
  chromeApi().runtime.getManifest = original.getManifest;
});

/** Records every injection, and refuses the tabs it is told to. */
const injecting = (refuse: number[] = []): Injection[] => {
  const injections: Injection[] = [];
  chromeApi().scripting.executeScript = async (injection: Injection) => {
    if (refuse.includes(injection.target.tabId)) throw new Error("Cannot access a chrome:// URL");
    injections.push(injection);
    return [];
  };
  return injections;
};

describe("the files a page needs", () => {
  test("come from the manifest and from the worker's own registration, as root-relative paths", async () => {
    chromeApi().runtime.getManifest = () => ({ content_scripts: [{ js: ["chrome-extension://abc/relay.1.js"] }] });
    chromeApi().scripting.getRegisteredContentScripts = async () => [
      { id: "other", js: ["isolated.js"], world: "ISOLATED" },
      { id: "srcContentsPageBridge", js: ["chrome-extension://abc/page-bridge.2.js"], world: "MAIN" },
    ];
    expect(await bridgeFiles()).toEqual({ relay: ["relay.1.js"], bridge: ["page-bridge.2.js"] });
  });

  test("wait for a registration still in flight on a cold start", async () => {
    let asked = 0;
    chromeApi().scripting.getRegisteredContentScripts = async () =>
      ++asked < 3 ? [] : [{ id: "srcContentsPageBridge", js: ["page-bridge.3.js"], world: "MAIN" }];
    expect((await bridgeFiles()).bridge).toEqual(["page-bridge.3.js"]);
    expect(asked).toBe(3);
  });
});

describe("attaching", () => {
  test("injects the relay first, then the bridge into the page's own world", async () => {
    const injections = injecting();
    expect(await attach(7)).toBe(true);
    expect(injections).toEqual([
      { target: { tabId: 7 }, files: ["relay.test.js"] },
      { target: { tabId: 7 }, files: ["page-bridge.test.js"], world: "MAIN" },
    ]);
  });

  test("a page Chrome keeps extensions out of is not attached to, and says so", async () => {
    injecting([9]);
    expect(await attach(9)).toBe(false);
  });

  test("every open http(s) tab, skipping discarded ones, and one refusal never stops the rest", async () => {
    const injections = injecting([2]);
    chromeApi().tabs.query = async (query: { url?: string[] }) => {
      expect(query.url).toEqual(["http://*/*", "https://*/*"]);
      return [
        { id: 1, url: "https://shop.example.com/" },
        { id: 2, url: "https://chrome.google.com/webstore" },
        { id: 3, url: "https://client.example.com/", discarded: true },
        { id: 4, url: "http://localhost:1234/" },
      ];
    };
    await attachAll();
    // Tabs are attached to side by side, so only the order within a tab is fixed.
    const worlds = (tabId: number): string[] =>
      injections
        .filter((injection) => injection.target.tabId === tabId)
        .map((injection) => injection.world ?? "ISOLATED");
    expect(worlds(1)).toEqual(["ISOLATED", "MAIN"]);
    expect(worlds(4)).toEqual(["ISOLATED", "MAIN"]);
    expect(worlds(2)).toEqual([]);
    expect(worlds(3)).toEqual([]);
  });
});
