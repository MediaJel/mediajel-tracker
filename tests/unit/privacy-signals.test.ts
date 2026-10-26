/**
 * Privacy signals (src/shared/utils/privacy-signals.ts) that gate the Google Ads plugin and click-ID persistence.
 */
import { describe, expect, test } from "bun:test";

import { adStorageDenied, gpcEnabled } from "../../src/shared/utils/privacy-signals";

// gtag() pushes its Arguments object, not an array; build real ones the same way.
function gtagArgs(..._: unknown[]) {
  return arguments;
}

describe("adStorageDenied", () => {
  test("no consent commands means consent mode is not in use", () => {
    expect(adStorageDenied([])).toBe(false);
    expect(adStorageDenied([{ event: "gtm.js" }, gtagArgs("config", "AW-1")])).toBe(false);
  });

  test("a default of denied blocks", () => {
    expect(adStorageDenied([gtagArgs("consent", "default", { ad_storage: "denied" })])).toBe(true);
  });

  test("the latest decision wins", () => {
    const granted = [
      gtagArgs("consent", "default", { ad_storage: "denied" }),
      gtagArgs("consent", "update", { ad_storage: "granted" }),
    ];
    const revoked = [
      gtagArgs("consent", "default", { ad_storage: "granted" }),
      gtagArgs("consent", "update", { ad_storage: "denied" }),
    ];
    expect(adStorageDenied(granted)).toBe(false);
    expect(adStorageDenied(revoked)).toBe(true);
  });

  test("array-shaped pushes and region-scoped defaults count too", () => {
    expect(adStorageDenied([["consent", "default", { ad_storage: "denied", region: ["US-CA"] }]])).toBe(true);
  });

  test("a missing or odd dataLayer does not block", () => {
    expect(adStorageDenied(undefined)).toBe(false);
    expect(adStorageDenied({ push: () => 0 })).toBe(false);
  });
});

describe("gpcEnabled", () => {
  test("only an explicit Global Privacy Control signal counts", () => {
    expect(gpcEnabled({ globalPrivacyControl: true })).toBe(true);
    expect(gpcEnabled({ globalPrivacyControl: false })).toBe(false);
    expect(gpcEnabled({})).toBe(false);
    expect(gpcEnabled(undefined)).toBe(false);
  });
});
