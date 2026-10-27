/**
 * Navigations a page starts from script (src/shared/google-click-ids/script-navigation.ts): window.open and, through
 * the Navigation API, location.href = … / location.assign / location.replace. A fake window records what was opened or
 * navigated to; navigate() dispatches a Navigation API event and reports whether it was cancelled.
 */
import { describe, expect, test } from "bun:test";

import { decorateScriptNavigations } from "../../../src/shared/google-click-ids/script-navigation";

const G = "EAIaIQobChMItestGclid_1-2";
const scope = { hostname: "www.landing.example", cookieDomain: "landing.example", carryInUrl: true };

const fakeWindow = ({ navigationApi = true } = {}) => {
  const opened: unknown[][] = [];
  const navigatedTo: { method: string; url: string }[] = [];
  const navigateListeners: ((event: any) => void)[] = [];
  const win: any = {
    location: {
      href: "https://www.landing.example/deals",
      assign: (url: string) => navigatedTo.push({ method: "assign", url }),
      replace: (url: string) => navigatedTo.push({ method: "replace", url }),
    },
    open: (...args: unknown[]) => {
      opened.push(args);
      return { name: "popup" };
    },
  };
  if (navigationApi) win.navigation = { addEventListener: (type: string, fn: any) => type === "navigate" && navigateListeners.push(fn) };
  const navigate = (url: string, overrides: Record<string, unknown> = {}): boolean => {
    let cancelled = false;
    const event = {
      cancelable: true,
      userInitiated: false,
      formData: null,
      downloadRequest: null,
      hashChange: false,
      navigationType: "push",
      destination: { url, sameDocument: false },
      preventDefault: () => (cancelled = true),
      ...overrides,
    };
    navigateListeners.forEach((fn) => fn(event));
    return cancelled;
  };
  return { win, opened, navigatedTo, navigate };
};

const install = (getIds: () => any = () => ({ gclid: G }), options = {}) => {
  const page = fakeWindow(options);
  decorateScriptNavigations(page.win, getIds, scope);
  return page;
};

describe("window.open", () => {
  test("adds the click to a URL on another site, keeping the window name, the features and what open returns", () => {
    const page = install();
    expect(page.win.open("https://shop.store.example/menu", "_blank", "noopener")).toEqual({ name: "popup" });
    expect(page.opened).toEqual([[`https://shop.store.example/menu?gclid=${G}`, "_blank", "noopener"]]);
  });

  test("a path on this site gets it too and stays relative; a call without a URL or another scheme is left alone", () => {
    const page = install();
    page.win.open("/checkout");
    page.win.open();
    page.win.open("mailto:hello@landing.example");
    expect(page.opened).toEqual([[`/checkout?gclid=${G}`], [], ["mailto:hello@landing.example"]]);
  });

  test("a signed URL, or one that already carries a click ID, opens exactly as asked", () => {
    const page = install();
    page.win.open("https://files.example/r.pdf?X-Amz-Signature=abc");
    page.win.open(`https://shop.store.example/?gclid=${G}`);
    expect(page.opened).toEqual([["https://files.example/r.pdf?X-Amz-Signature=abc"], [`https://shop.store.example/?gclid=${G}`]]);
  });

  test("without a click, or when reading it fails, the popup still opens exactly as asked", () => {
    expect(install(() => null).win.open("https://shop.store.example/")).toEqual({ name: "popup" });
    const failing = install(() => {
      throw new Error("storage blocked");
    });
    failing.win.open("https://shop.store.example/");
    expect(failing.opened).toEqual([["https://shop.store.example/"]]);
  });
});

describe("navigations started by script (Navigation API)", () => {
  test("location.href = another site: the navigation is cancelled and redone with the click added", () => {
    const page = install();
    expect(page.navigate("https://shop.store.example/menu?x=1#top")).toBe(true);
    expect(page.navigatedTo).toEqual([{ method: "assign", url: `https://shop.store.example/menu?x=1&gclid=${G}#top` }]);
  });

  test("Safari marks a script navigation inside a click handler as user-initiated; with no element behind it, it's still carried", () => {
    const page = install();
    expect(page.navigate("https://shop.store.example/menu", { userInitiated: true, sourceElement: null })).toBe(true);
    expect(page.navigatedTo).toEqual([{ method: "assign", url: `https://shop.store.example/menu?gclid=${G}` }]);
  });

  test("a navigation a link or form element started is left to the link rules", () => {
    const page = install();
    expect(page.navigate("https://shop.store.example/menu", { userInitiated: true, sourceElement: { tagName: "A" } })).toBe(false);
    expect(page.navigate("https://shop.store.example/menu", { userInitiated: false, sourceElement: { tagName: "FORM" } })).toBe(false);
    expect(page.navigatedTo).toEqual([]);
  });

  test("location.replace(…) is redone as a replace", () => {
    const page = install();
    expect(page.navigate("https://shop.store.example/menu", { navigationType: "replace" })).toBe(true);
    expect(page.navigatedTo).toEqual([{ method: "replace", url: `https://shop.store.example/menu?gclid=${G}` }]);
  });

  test.each([
    ["a link click, in a browser that doesn't say which element started it", { userInitiated: true }],
    ["a form post", { formData: {} }],
    ["a download", { downloadRequest: "report.pdf" }],
    ["back/forward", { navigationType: "traverse" }],
    ["a reload", { navigationType: "reload" }],
    ["a change within the page", { destination: { url: "https://www.landing.example/deals#faq", sameDocument: true } }],
    ["a hash change", { hashChange: true }],
    ["a navigation that can't be cancelled", { cancelable: false }],
  ])("leaves %s alone", (_, overrides) => {
    const page = install();
    expect(page.navigate("https://shop.store.example/menu", overrides)).toBe(false);
    expect(page.navigatedTo).toEqual([]);
  });

  test("a URL that already carries a click ID passes through, so the redone navigation isn't caught again", () => {
    const page = install();
    expect(page.navigate(`https://shop.store.example/menu?gclid=${G}`)).toBe(false);
  });

  test("if redoing the navigation fails, it goes ahead to the original URL rather than stopping", () => {
    const page = install();
    let calls = 0;
    page.win.location.assign = (url: string) => {
      calls += 1;
      if (calls === 1) throw new Error("blocked");
      page.navigatedTo.push({ method: "assign", url });
    };
    page.navigate("https://shop.store.example/menu");
    expect(page.navigatedTo).toEqual([{ method: "assign", url: "https://shop.store.example/menu" }]);
  });

  test("without a click, or in a browser without the Navigation API, nothing changes", () => {
    const page = install(() => null);
    expect(page.navigate("https://shop.store.example/menu")).toBe(false);
    expect(() => install(undefined, { navigationApi: false })).not.toThrow();
  });
});
