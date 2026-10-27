/**
 * The Google Ads extension (src/shared/snowplow/extensions/google-ads.ts) with a fake window/document on globalThis
 * (bun has no DOM). It wraps trackTransaction so every purchase also fires a Google Ads conversion via gtag.
 */
import { afterEach, describe, expect, test } from "bun:test";

import withSnowplowGoogleAdsExtension from "../../../src/shared/snowplow/extensions/google-ads";

const fakePage = (dataLayer: unknown = []) => {
  const scripts: any[] = [];
  (globalThis as any).document = {
    head: { appendChild: (el: any) => scripts.push(el) },
    createElement: () => ({ src: "", async: false }),
    getElementsByTagName: () => scripts,
  };
  (globalThis as any).window = { dataLayer };
  return scripts;
};

afterEach(() => {
  delete (globalThis as any).window;
  delete (globalThis as any).document;
});

const fakeTracker = (context: Record<string, string>) => {
  const calls: string[] = [];
  const tracker: any = {
    context,
    initialize: () => undefined,
    record: () => undefined,
    trackSignup: () => undefined,
    ecommerce: {
      trackTransaction: (input: any) => calls.push(`snowplow ${input.id}`),
      trackAddToCart: () => undefined,
      trackRemoveFromCart: () => undefined,
    },
  };
  return { tracker, calls };
};

const purchase = { id: "order-1", total: 42.5, currency: "USD", tax: 0, shipping: 0, city: "", state: "", country: "", items: [] };
const commands = () => (globalThis as any).window.dataLayer.map((entry: any) => Array.prototype.slice.call(entry));

describe("withSnowplowGoogleAdsExtension", () => {
  test("without a conversion ID it warns and returns the tracker untouched instead of throwing", () => {
    const scripts = fakePage();
    const { tracker } = fakeTracker({ conversionLabel: "abc" });
    const original = tracker.ecommerce.trackTransaction;

    expect(() => withSnowplowGoogleAdsExtension(tracker)).not.toThrow();
    expect(tracker.ecommerce.trackTransaction).toBe(original);
    expect(scripts).toHaveLength(0);
  });

  test("loads gtag.js for the conversion ID, adding the AW- prefix when missing", () => {
    const scripts = fakePage();
    withSnowplowGoogleAdsExtension(fakeTracker({ conversionId: "123456", conversionLabel: "abc" }).tracker);
    expect(scripts.map((s) => s.src)).toEqual(["https://www.googletagmanager.com/gtag/js?id=AW-123456"]);
  });

  test("a purchase fires the Google Ads conversion after our own transaction event", () => {
    fakePage();
    const { tracker, calls } = fakeTracker({ conversionId: "AW-123456", conversionLabel: "abc" });
    withSnowplowGoogleAdsExtension(tracker);

    tracker.ecommerce.trackTransaction(purchase);

    expect(calls).toEqual(["snowplow order-1"]);
    expect(commands().filter((c: any[]) => c[0] === "event")).toEqual([
      ["event", "conversion", { send_to: "AW-123456/abc", value: 42.5, currency: "USD", transaction_id: "order-1" }],
    ]);
  });

  test("crossDomainSites sets Google's linker before the config command", () => {
    fakePage();
    withSnowplowGoogleAdsExtension(
      fakeTracker({ conversionId: "AW-123456", conversionLabel: "abc", crossDomainSites: "a.example, b.example" }).tracker,
    );
    const names = commands().map((c: any[]) => `${c[0]}:${typeof c[1] === "string" ? c[1] : ""}`);
    expect(names.indexOf("set:linker")).toBeGreaterThan(-1);
    expect(names.indexOf("set:linker")).toBeLessThan(names.indexOf("config:AW-123456"));
    expect(commands()[names.indexOf("set:linker")][2]).toEqual({ domains: ["a.example", "b.example"] });
  });

  test("with Global Privacy Control on it loads nothing and sends no conversion", () => {
    const scripts = fakePage();
    (globalThis as any).window.navigator = { globalPrivacyControl: true };
    const { tracker, calls } = fakeTracker({ conversionId: "AW-123456", conversionLabel: "abc" });
    const original = tracker.ecommerce.trackTransaction;

    withSnowplowGoogleAdsExtension(tracker);
    tracker.ecommerce.trackTransaction(purchase);

    expect(scripts).toHaveLength(0);
    expect(tracker.ecommerce.trackTransaction).toBe(original);
    expect(calls).toEqual(["snowplow order-1"]);
    expect((globalThis as any).window.dataLayer).toEqual([]);
  });

  test("a loader that throws (script injection blocked) keeps purchase tracking and the site's own gtag working", () => {
    fakePage();
    (globalThis as any).document.createElement = () => {
      throw new Error("blocked by the page");
    };
    const sent: any[] = [];
    (globalThis as any).window.gtag = (...args: any[]) => sent.push(args);
    const { tracker, calls } = fakeTracker({ conversionId: "AW-123456", conversionLabel: "abc" });

    expect(() => withSnowplowGoogleAdsExtension(tracker)).not.toThrow();
    tracker.ecommerce.trackTransaction(purchase);

    expect(calls).toEqual(["snowplow order-1"]);
    expect(sent.filter((args) => args[0] === "event")).toEqual([
      ["event", "conversion", { send_to: "AW-123456/abc", value: 42.5, currency: "USD", transaction_id: "order-1" }],
    ]);
  });

  test("on a page running the click-ID runtime, Google's click cookie is prepared right before the conversion fires", () => {
    fakePage();
    const order: string[] = [];
    (globalThis as any).window.mjPrepareGoogleConversion = () => {
      order.push("prepare");
      return ["_gcl_aw"];
    };
    const { tracker } = fakeTracker({ conversionId: "AW-123456", conversionLabel: "abc" });
    withSnowplowGoogleAdsExtension(tracker);
    const gtag = (globalThis as any).window.gtag;
    (globalThis as any).window.gtag = (...args: any[]) => {
      if (args[0] === "event") order.push("conversion");
      return gtag(...args);
    };

    tracker.ecommerce.trackTransaction(purchase);

    expect(order).toEqual(["prepare", "conversion"]);
  });

  test("a click-ID runtime that fails while preparing never stops the conversion", () => {
    fakePage();
    (globalThis as any).window.mjPrepareGoogleConversion = () => {
      throw new Error("storage blocked");
    };
    const { tracker, calls } = fakeTracker({ conversionId: "AW-123456", conversionLabel: "abc" });
    withSnowplowGoogleAdsExtension(tracker);

    expect(() => tracker.ecommerce.trackTransaction(purchase)).not.toThrow();
    expect(calls).toEqual(["snowplow order-1"]);
    expect(commands().filter((c: any[]) => c[0] === "event")).toHaveLength(1);
  });

  test("an unusable dataLayer turns conversions off without breaking purchase tracking", () => {
    fakePage({ notAnArray: true });
    const { tracker, calls } = fakeTracker({ conversionId: "AW-123456", conversionLabel: "abc" });
    withSnowplowGoogleAdsExtension(tracker);
    expect(() => tracker.ecommerce.trackTransaction(purchase)).not.toThrow();
    expect(calls).toEqual(["snowplow order-1"]);
  });
});
