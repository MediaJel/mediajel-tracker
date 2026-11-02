/**
 * Unit tests for snowplow/page-context.ts — the pageUrl / referrer override used when the tag runs
 * inside a Shopify custom pixel's sandboxed iframe.
 *
 * Run: `bun test` from packages/tracker-core. Puts a fake `window` on globalThis (bun has no DOM) that
 * records the Snowplow commands, so nothing is sent anywhere.
 */
import { afterEach, describe, expect, test } from "bun:test";

import { applyPageContext, isShopifyPixelSandbox, toHttpUrl } from "../src/snowplow/page-context";

const SANDBOX_PATH = "/web-pixels@0b92dcedw658847c9p94194e39m8bc44e9f/custom/web-pixel-168951993@1/sandbox/modern/";

const withWindow = (pathname: string) => {
  const calls: unknown[][] = [];
  (globalThis as any).window = {
    location: { pathname },
    tracker: (...args: unknown[]) => calls.push(args),
  };
  return calls;
};

afterEach(() => {
  delete (globalThis as any).window;
});

describe("applyPageContext", () => {
  test("sets the custom URL and referrer from the pixel", () => {
    const calls = withWindow(SANDBOX_PATH);
    applyPageContext({
      pageUrl: "https://mytrumoods.com/products/sleep-gummies?variant=1",
      referrer: "https://www.google.com/",
    });
    expect(calls).toEqual([
      ["setCustomUrl", "https://mytrumoods.com/products/sleep-gummies?variant=1"],
      ["setReferrerUrl", "https://www.google.com/"],
    ]);
  });

  test("sends nothing when no page context is supplied (normal installs)", () => {
    const calls = withWindow("/products/sleep-gummies");
    applyPageContext({});
    expect(calls).toEqual([]);
  });

  test("ignores non-http values instead of overwriting page_url", () => {
    const calls = withWindow(SANDBOX_PATH);
    applyPageContext({ pageUrl: "javascript:alert(1)", referrer: "not a url" });
    expect(calls).toEqual([]);
  });

  test("an empty referrer (direct visit) leaves the referrer alone", () => {
    const calls = withWindow(SANDBOX_PATH);
    applyPageContext({ pageUrl: "https://mytrumoods.com/", referrer: "" });
    expect(calls).toEqual([["setCustomUrl", "https://mytrumoods.com/"]]);
  });
});

describe("isShopifyPixelSandbox", () => {
  test("detects the custom-pixel sandbox path", () => {
    expect(isShopifyPixelSandbox(SANDBOX_PATH)).toBe(true);
    expect(isShopifyPixelSandbox("/collections/all")).toBe(false);
  });
});

describe("toHttpUrl", () => {
  test("normalises http(s) URLs and rejects the rest", () => {
    expect(toHttpUrl("https://mytrumoods.com")).toBe("https://mytrumoods.com/");
    expect(toHttpUrl("ftp://x.com/a")).toBeUndefined();
    expect(toHttpUrl(undefined)).toBeUndefined();
  });
});
