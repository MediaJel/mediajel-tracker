/**
 * Address-bar carry-over (src/shared/google-click-ids/url-carry.ts): the persisted click stays in the URL of every next
 * route, including SPA route changes. A fake history records every call the code makes and stands in for the router's.
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

const fakeWindow = (href: string) => {
  const calls: { method: string; state: unknown; url?: string }[] = [];
  const listeners: Record<string, () => void> = {};
  const location = { href };
  const history: any = { state: { router: "next", key: "k1" } };
  const navigate = (method: string) =>
    function (_this: unknown, state: unknown, _title: string, url?: string) {
      calls.push({ method, state, url });
      history.state = state;
      if (url) location.href = new URL(url, location.href).href;
    };
  history.pushState = function (state: unknown, title: string, url?: string) {
    return navigate("pushState")(this, state, title, url);
  };
  history.replaceState = function (state: unknown, title: string, url?: string) {
    return navigate("replaceState")(this, state, title, url);
  };
  const win: any = { location, history, addEventListener: (type: string, fn: () => void) => (listeners[type] = fn) };
  return { win, calls, listeners, location, history };
};

describe("keepClickIdsInUrl", () => {
  test("on load, adds the click to the address bar and keeps the router's history.state", () => {
    const page = fakeWindow("https://shop.example.com/menu");
    keepClickIdsInUrl(page.win, () => ({ gclid: G }));
    expect(page.calls).toEqual([
      { method: "replaceState", state: { router: "next", key: "k1" }, url: `https://shop.example.com/menu?gclid=${G}` },
    ]);
  });

  test("an SPA route change runs the router's own call untouched, then the new route keeps the click", () => {
    const page = fakeWindow(`https://shop.example.com/menu?gclid=${G}`);
    keepClickIdsInUrl(page.win, () => ({ gclid: G }));
    page.win.history.pushState({ key: "k2" }, "", "/checkout");
    expect(page.calls).toEqual([
      { method: "pushState", state: { key: "k2" }, url: "/checkout" },
      { method: "replaceState", state: { key: "k2" }, url: `https://shop.example.com/checkout?gclid=${G}` },
    ]);
  });

  test("back/forward and hash changes are covered", () => {
    const page = fakeWindow(`https://shop.example.com/menu?gclid=${G}`);
    keepClickIdsInUrl(page.win, () => ({ gclid: G }));
    page.location.href = "https://shop.example.com/cart";
    page.listeners.popstate();
    page.location.href = "https://shop.example.com/cart?gclid=" + G + "#items";
    page.listeners.hashchange();
    expect(page.calls).toEqual([
      { method: "replaceState", state: { router: "next", key: "k1" }, url: `https://shop.example.com/cart?gclid=${G}` },
    ]);
  });

  test("nothing changes without a click", () => {
    const page = fakeWindow("https://shop.example.com/menu");
    keepClickIdsInUrl(page.win, () => null);
    page.win.history.pushState({ key: "k2" }, "", "/checkout");
    expect(page.calls).toEqual([{ method: "pushState", state: { key: "k2" }, url: "/checkout" }]);
  });

  test("a failure while reading the click never breaks the router's navigation", () => {
    const page = fakeWindow("https://shop.example.com/menu");
    keepClickIdsInUrl(page.win, () => {
      throw new Error("storage blocked");
    });
    expect(() => page.win.history.pushState({ key: "k2" }, "", "/checkout")).not.toThrow();
    expect(page.location.href).toBe("https://shop.example.com/checkout");
  });
});
