/**
 * Address-bar carry-over (src/shared/google-click-ids/url-carry.ts): the persisted click stays in the URL of every next
 * route, including SPA route changes. A fake history records every call that reaches the browser's own methods (kept on
 * its prototype, as in a real browser); a fake timer queue stands in for setTimeout.
 */
import { describe, expect, test } from "bun:test";

import { keepClickIdsInUrl, urlWithClickIds } from "../../../src/shared/google-click-ids/url-carry";

const G = "EAIaIQobChMItestGclid_1-2";

describe("urlWithClickIds", () => {
  test.each([
    ["https://shop.example.com/menu", `https://shop.example.com/menu?gclid=${G}`],
    ["https://shop.example.com/menu?x=1#top", `https://shop.example.com/menu?x=1&gclid=${G}#top`],
    ["https://shop.example.com/#/route?a=1", `https://shop.example.com/?gclid=${G}#/route?a=1`],
  ])("%s", (href, expected) => {
    expect(urlWithClickIds(href, { gclid: G })).toBe(expected);
  });

  test("returns null when the URL already holds a click ID, or there is no click", () => {
    expect(urlWithClickIds(`https://x.example/?gclid=${G}`, { gclid: G })).toBeNull();
    expect(urlWithClickIds("https://x.example/?wbraid=CjkKTestWbraid34", { gclid: G })).toBeNull();
    expect(urlWithClickIds("https://x.example/", null)).toBeNull();
    expect(urlWithClickIds("https://x.example/", {})).toBeNull();
  });
});

const fakeWindow = (href: string, readyState = "complete") => {
  const calls: { method: string; state: unknown; url?: string }[] = [];
  const listeners: Record<string, () => void> = {};
  const location = { href };
  const browserMethod = (method: string) =>
    function (this: any, state: unknown, _title: string, url?: string) {
      calls.push({ method, state, url });
      this.state = state;
      if (url) location.href = new URL(url, location.href).href;
    };
  // As in a browser, the real methods live on History.prototype; routers and other scripts replace them on the instance.
  class FakeHistory {
    state: unknown = { router: "next", key: "k1" };
  }
  Object.assign(FakeHistory.prototype, { pushState: browserMethod("pushState"), replaceState: browserMethod("replaceState") });
  const history: any = new FakeHistory();
  const timers = new Map<number, () => void>();
  let lastTimer = 0;
  const win: any = {
    location,
    history,
    document: { readyState },
    addEventListener: (type: string, fn: () => void) => (listeners[type] = fn),
    setTimeout: (fn: () => void) => {
      timers.set(++lastTimer, fn);
      return lastTimer;
    },
    clearTimeout: (id: number) => timers.delete(id),
  };
  // Runs the pending timers, as the browser does once the site's navigation has settled.
  const settle = () => {
    const due = [...timers.values()];
    timers.clear();
    due.forEach((fn) => fn());
  };
  return { win, calls, listeners, location, history, settle };
};

const click = () => ({ gclid: G });
const ours = (calls: { url?: string }[]) => calls.filter((call) => !!call.url && call.url.indexOf("gclid=") !== -1);

describe("keepClickIdsInUrl", () => {
  test("once the page has loaded, adds the click to the address bar as a search parameter and keeps history.state", () => {
    const page = fakeWindow("https://shop.example.com/menu");
    keepClickIdsInUrl(page.win, click);
    page.settle();
    expect(page.calls).toEqual([
      { method: "replaceState", state: { router: "next", key: "k1" }, url: `https://shop.example.com/menu?gclid=${G}` },
    ]);
  });

  test("while the page is still loading, the first update waits for the load event so it can't race hydration", () => {
    const page = fakeWindow("https://shop.example.com/menu", "interactive");
    keepClickIdsInUrl(page.win, click);
    page.settle();
    expect(page.calls).toEqual([]);

    page.win.document.readyState = "complete";
    page.listeners.load();
    page.settle();
    expect(page.calls).toEqual([
      { method: "replaceState", state: { router: "next", key: "k1" }, url: `https://shop.example.com/menu?gclid=${G}` },
    ]);
  });

  test("an SPA route change runs the router's call untouched, its code sees the URL it set, then the click follows", () => {
    const page = fakeWindow(`https://shop.example.com/menu?gclid=${G}`);
    keepClickIdsInUrl(page.win, click);
    page.win.history.pushState({ key: "k2" }, "", "/checkout");
    expect(page.location.href).toBe("https://shop.example.com/checkout");

    page.settle();
    expect(page.calls).toEqual([
      { method: "pushState", state: { key: "k2" }, url: "/checkout" },
      { method: "replaceState", state: { key: "k2" }, url: `https://shop.example.com/checkout?gclid=${G}` },
    ]);
  });

  test("a burst of URL changes from the site gets a single update from us, after the last one", () => {
    const page = fakeWindow(`https://shop.example.com/menu?gclid=${G}`);
    keepClickIdsInUrl(page.win, click);
    for (let i = 1; i <= 10; i++) page.win.history.replaceState({ key: `k${i}` }, "", `/menu?page=${i}`);
    page.settle();
    expect(ours(page.calls)).toEqual([
      { method: "replaceState", state: { key: "k10" }, url: `https://shop.example.com/menu?page=10&gclid=${G}` },
    ]);
  });

  test("never more than 20 of our updates in any 30 seconds, well inside Safari's limit on history calls", () => {
    let clock = 0;
    const page = fakeWindow(`https://shop.example.com/menu?gclid=${G}`);
    keepClickIdsInUrl(page.win, click, () => clock);
    for (let i = 1; i <= 25; i++) {
      page.win.history.pushState({}, "", `/p${i}`);
      page.settle();
      clock += 1000;
    }
    expect(ours(page.calls)).toHaveLength(20);

    clock += 30 * 1000;
    page.win.history.pushState({}, "", "/later");
    page.settle();
    expect(ours(page.calls)).toHaveLength(21);
  });

  test("our update goes to the browser's own method, so a history hook installed before us (GA4, Tag Manager) never sees it", () => {
    const page = fakeWindow("https://shop.example.com/menu");
    const seenByHook: (string | undefined)[] = [];
    const browserReplaceState = page.history.replaceState;
    page.history.replaceState = function (this: any, state: unknown, title: string, url?: string) {
      seenByHook.push(url);
      return browserReplaceState.call(this, state, title, url);
    };
    keepClickIdsInUrl(page.win, click);
    page.win.history.replaceState({ key: "k2" }, "", "/cart");
    page.settle();
    expect(seenByHook).toEqual(["/cart"]);
    expect(page.location.href).toBe(`https://shop.example.com/cart?gclid=${G}`);
  });

  test("back/forward and hash changes are covered", () => {
    const page = fakeWindow(`https://shop.example.com/menu?gclid=${G}`);
    keepClickIdsInUrl(page.win, click);
    page.settle();
    page.location.href = "https://shop.example.com/cart";
    page.listeners.popstate();
    page.settle();
    page.location.href = "https://shop.example.com/cart?gclid=" + G + "#items";
    page.listeners.hashchange();
    page.settle();
    expect(page.calls).toEqual([
      { method: "replaceState", state: { router: "next", key: "k1" }, url: `https://shop.example.com/cart?gclid=${G}` },
    ]);
  });

  test("nothing changes without a click", () => {
    const page = fakeWindow("https://shop.example.com/menu");
    keepClickIdsInUrl(page.win, () => null);
    page.win.history.pushState({ key: "k2" }, "", "/checkout");
    page.settle();
    expect(page.calls).toEqual([{ method: "pushState", state: { key: "k2" }, url: "/checkout" }]);
  });

  test("a failure while reading the click never breaks the router's navigation", () => {
    const page = fakeWindow("https://shop.example.com/menu");
    keepClickIdsInUrl(page.win, () => {
      throw new Error("storage blocked");
    });
    expect(() => page.win.history.pushState({ key: "k2" }, "", "/checkout")).not.toThrow();
    expect(() => page.settle()).not.toThrow();
    expect(page.location.href).toBe("https://shop.example.com/checkout");
  });
});
