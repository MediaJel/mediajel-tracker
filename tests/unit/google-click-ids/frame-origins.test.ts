/**
 * Which iframes may receive the click IDs (src/shared/google-click-ids/frame-origins.ts). Run: `bun test tests`.
 */
import { describe, expect, test } from "bun:test";

import { frameOriginAllowed } from "../../../src/shared/google-click-ids/frame-origins";

describe("frameOriginAllowed", () => {
  test("frames on this site or on a crossDomainSites host", () => {
    expect(frameOriginAllowed("https://menu.example.com", "example.com", [])).toBe(true);
    expect(frameOriginAllowed("https://checkout.store-site.com", "example.com", ["store-site.com"])).toBe(true);
  });

  test("embedded menu and checkout platforms clients' stores run on, without any setup", () => {
    expect(frameOriginAllowed("https://dutchie.com", "example.com", [])).toBe(true);
    expect(frameOriginAllowed("https://stores.dispenseapp.com", "example.com", [])).toBe(true);
    expect(frameOriginAllowed("https://shop.sweedpos.com", "example.com", [])).toBe(true);
  });

  test("an ad or widget frame elsewhere on the page that asks gets nothing", () => {
    expect(frameOriginAllowed("https://googleads.g.doubleclick.net", "example.com", [])).toBe(false);
    expect(frameOriginAllowed("https://notdutchie.com", "example.com", [])).toBe(false);
    expect(frameOriginAllowed("null", "example.com", [])).toBe(false);
  });
});
