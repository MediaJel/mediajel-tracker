/**
 * The click-ID runtime (src/shared/google-click-ids/index.ts → createClickIdRuntime) against a fake window: capture on
 * the landing page, read-back on later pages, privacy gates, kill switches and the Google feed before a conversion.
 */
import { describe, expect, test } from "bun:test";

import { createClickIdRuntime } from "../../../src/shared/google-click-ids";

const NOW = 1_800_000_000;
const DAY = 86_400;
const G = "EAIaIQobChMItestGclid_1-2";

// A cookie jar that behaves like a browser for what the runtime relies on: Domain= must be accepted, Max-Age=0 deletes.
const cookieJar = (accepts = (domain: string) => domain.indexOf(".") !== -1) => {
  const jar: Record<string, string> = {};
  return {
    jar,
    get cookie() {
      return Object.keys(jar).map((name) => `${name}=${jar[name]}`).join("; ");
    },
    set cookie(text: string) {
      const pair = text.split("; ")[0];
      const name = pair.slice(0, pair.indexOf("="));
      const domain = (/Domain=([^;]+)/.exec(text) || [])[1];
      if (domain && !accepts(domain)) return;
      if (/Max-Age=0(;|$)/.test(text)) delete jar[name];
      else jar[name] = pair.slice(name.length + 1);
    },
  };
};

interface PageOptions {
  url?: string;
  navigationUrl?: string;
  gpc?: boolean;
  dataLayer?: unknown[];
  jar?: ReturnType<typeof cookieJar>;
}

const fakeWindow = ({ url = "https://shop.example.com/", navigationUrl, gpc = false, dataLayer = [], jar }: PageOptions) => {
  const cookies = jar || cookieJar((domain) => domain === "example.com" || domain === "shop.example.com");
  const listeners: Record<string, (event: any) => void> = {};
  const local: Record<string, string> = {};
  const parsed = new URL(url);
  const location = { href: url, hostname: parsed.hostname, protocol: parsed.protocol };
  const historyCalls: string[] = [];
  const timers = new Map<number, () => void>();
  let lastTimer = 0;
  const record = (state: unknown, _title: string, next?: string) => {
    if (next) location.href = new URL(next, location.href).href;
    historyCalls.push(location.href);
  };
  const document: any = {
    location,
    readyState: "complete",
    get cookie() {
      return cookies.cookie;
    },
    set cookie(text: string) {
      cookies.cookie = text;
    },
    addEventListener: (type: string, fn: any) => (listeners[type] = fn),
  };
  const win: any = {
    document,
    location,
    history: { state: null, pushState: record, replaceState: record },
    navigator: { globalPrivacyControl: gpc },
    performance: { getEntriesByType: () => [{ name: navigationUrl || url }] },
    localStorage: {
      getItem: (key: string) => (key in local ? local[key] : null),
      setItem: (key: string, value: string) => (local[key] = value),
      removeItem: (key: string) => delete local[key],
    },
    dataLayer,
    frames: { length: 0 },
    addEventListener: () => undefined,
    setTimeout: (fn: () => void) => {
      timers.set(++lastTimer, fn);
      return lastTimer;
    },
    clearTimeout: (id: number) => timers.delete(id),
  };
  win.self = win;
  win.top = win;
  win.parent = win;
  // Runs the pending timers, as the browser does once the page's navigation has settled.
  const settle = () => {
    const due = [...timers.values()];
    timers.clear();
    due.forEach((fn) => fn());
  };
  return { win, cookies, listeners, local, historyCalls, settle };
};

const context = (extra: Record<string, string> = {}) => ({ appId: "app-1", event: "transaction", ...extra }) as any;
const start = (win: any, extra: Record<string, string> = {}, now = NOW) =>
  createClickIdRuntime(context(extra), win, () => now);

describe("capture and read-back", () => {
  test("persists a gclid from the landing URL in a root-domain cookie", () => {
    const page = fakeWindow({ url: `https://shop.example.com/?gclid=${G}` });
    start(page.win);
    expect(page.cookies.jar._mj_gcl).toBe(`1.${NOW}.${G}..`);
    expect(page.local._mj_gcl).toBe(`1.${NOW}.${G}..`);
  });

  test("recovers a gclid an SPA removed from the address bar before the tag ran", () => {
    const page = fakeWindow({ url: "https://shop.example.com/menu", navigationUrl: `https://shop.example.com/?gclid=${G}` });
    expect(start(page.win)!.current()).toEqual({ ids: { gclid: G }, ts: NOW });
  });

  test("a later page without the click reads it back with the original click time", () => {
    const landing = fakeWindow({ url: `https://www.example.com/?gclid=${G}` });
    start(landing.win, {}, NOW - 3 * DAY);
    const checkout = fakeWindow({ url: "https://shop.example.com/checkout", jar: landing.cookies });
    expect(start(checkout.win)!.current()).toEqual({ ids: { gclid: G }, ts: NOW - 3 * DAY });
  });
});

describe("carry-over to the next route", () => {
  const visitWithStoredClick = (extra: Record<string, string> = {}) => {
    const jar = cookieJar((domain) => domain === "example.com");
    jar.cookie = `_mj_gcl=1.${NOW - DAY}.${G}..; Max-Age=100; Path=/`;
    const page = fakeWindow({ url: "https://shop.example.com/checkout?step=1#pay", jar });
    start(page.win, extra);
    page.settle();
    return page;
  };

  test("a route reached without the click gets it back in its address bar", () => {
    expect(visitWithStoredClick().historyCalls).toEqual([`https://shop.example.com/checkout?step=1&gclid=${G}#pay`]);
  });

  test("same-site links carry the click to the next route", () => {
    const page = visitWithStoredClick();
    const attrs: Record<string, string> = { href: "/thank-you" };
    const link = {
      tagName: "A",
      get href() {
        return new URL(attrs.href, page.win.location.href).href;
      },
      getAttribute: (name: string) => attrs[name] ?? null,
      setAttribute: (name: string, value: string) => (attrs[name] = value),
      hasAttribute: (name: string) => name in attrs,
      closest: () => null,
    };
    page.listeners.click({ type: "click", target: link, composedPath: () => [link] });
    expect(attrs.href).toBe(`/thank-you?gclid=${G}`);
  });

  test("carryInUrl=false leaves the address bar as it is", () => {
    expect(visitWithStoredClick({ carryInUrl: "false" }).historyCalls).toEqual([]);
  });
});

describe("privacy gates", () => {
  test("Global Privacy Control clears our stored click and turns the feature off", () => {
    const jar = cookieJar();
    jar.cookie = `_mj_gcl=1.${NOW - DAY}.${G}..; Max-Age=100; Path=/`;
    const page = fakeWindow({ url: `https://shop.example.com/?gclid=${G}`, gpc: true, jar });
    expect(start(page.win)).toBeNull();
    expect(jar.jar._mj_gcl).toBeUndefined();
  });

  test("denied ad_storage consent stores nothing and shares nothing", () => {
    const denied = [["consent", "default", { ad_storage: "denied" }]];
    const page = fakeWindow({ url: `https://shop.example.com/?gclid=${G}`, dataLayer: denied });
    const runtime = start(page.win)!;
    expect(page.cookies.jar._mj_gcl).toBeUndefined();
    expect(runtime.current()).toBeNull();
    expect(runtime.prepareConversion()).toEqual([]);
  });
});

describe("switches", () => {
  test("clickIds=false and impression pixels do nothing", () => {
    const page = fakeWindow({ url: `https://shop.example.com/?gclid=${G}` });
    expect(start(page.win, { clickIds: "false" })).toBeNull();
    expect(createClickIdRuntime(context({ event: "impression" }), page.win, () => NOW)).toBeNull();
    expect(page.cookies.jar._mj_gcl).toBeUndefined();
  });

  test("decorateLinks=false installs no link listeners", () => {
    const page = fakeWindow({ url: `https://shop.example.com/?gclid=${G}` });
    start(page.win, { decorateLinks: "false" });
    expect(Object.keys(page.listeners)).toEqual([]);
  });

  test("decorateLinks=linker decorates only the crossDomainSites hosts", () => {
    const page = fakeWindow({ url: `https://shop.example.com/?gclid=${G}` });
    start(page.win, { decorateLinks: "linker", crossDomainSites: "store-site.com, other.example.net" });
    const attrs: Record<string, string> = {};
    const link = (href: string) => ({
      tagName: "A",
      href,
      getAttribute: () => attrs[href] || href,
      setAttribute: (_: string, value: string) => (attrs[href] = value),
      hasAttribute: (name: string) => name === "href",
      closest: () => null,
    });
    const listed = link("https://www.store-site.com/menu");
    const unlisted = link("https://dutchie.com/stores/x");
    page.listeners.click({ type: "click", target: listed, composedPath: () => [listed] });
    page.listeners.click({ type: "click", target: unlisted, composedPath: () => [unlisted] });
    expect(attrs["https://www.store-site.com/menu"]).toBe(`https://www.store-site.com/menu?gclid=${G}`);
    expect(attrs["https://dutchie.com/stores/x"]).toBeUndefined();
  });
});

describe("prepareConversion (Google feed)", () => {
  test("seeds _gcl_aw on a checkout page whose URL has no click", () => {
    const jar = cookieJar((domain) => domain === "example.com");
    jar.cookie = `_mj_gcl=1.${NOW - DAY}.${G}..; Max-Age=100; Path=/`;
    const page = fakeWindow({ url: "https://shop.example.com/thank-you", jar });
    expect(start(page.win)!.prepareConversion()).toEqual(["_gcl_aw"]);
    expect(jar.jar._gcl_aw).toBe(`GCL.${NOW - DAY}.${G}`);
  });

  test("restores Google's cookie even when the URL carries the click (a carried URL doesn't mean gtag saw it)", () => {
    const page = fakeWindow({ url: `https://shop.example.com/thank-you?gclid=${G}` });
    expect(start(page.win)!.prepareConversion()).toEqual(["_gcl_aw"]);
    expect(page.cookies.jar._gcl_aw).toBe(`GCL.${NOW}.${G}`);
  });

  test("seedGoogleCookie=false never writes Google's cookies", () => {
    const jar = cookieJar((domain) => domain === "example.com");
    jar.cookie = `_mj_gcl=1.${NOW - DAY}.${G}..; Max-Age=100; Path=/`;
    const page = fakeWindow({ url: "https://shop.example.com/thank-you", jar });
    expect(start(page.win, { seedGoogleCookie: "false" })!.prepareConversion()).toEqual([]);
    expect(jar.jar._gcl_aw).toBeUndefined();
  });
});
