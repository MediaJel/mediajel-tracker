/**
 * Temporary rollout list (src/shared/google-click-ids/allowed-sites.ts): the sites click-ID persistence runs on while
 * it is proven out. Run: `bun test tests`.
 */
import { describe, expect, test } from "bun:test";

import { ALLOWED_SITES, onAllowedSite } from "../../../src/shared/google-click-ids/allowed-sites";

const SHARED_PLATFORMS = [
  "dutchie.com", "dispenseapp.com", "iheartjane.com", "myshopify.com", "wpengine.com", "wpenginepowered.com",
  "kinsta.cloud", "vercel.app", "netlify.app", "appspot.com", "squarespace.com", "wixsite.com", "pressdns.com",
];

// Sites taken off the rollout; rebuilding the list from the Google Ads accounts must not bring them back.
const TAKEN_OFF = ["visitcatalyst.com", "catalystretails.com", "catalyst-cannabis.com"]; // Catalyst, 2026-10-28

describe("onAllowedSite", () => {
  test("a listed site and every subdomain of it", () => {
    expect(onAllowedSite("thelandingdispensaries.com")).toBe(true);
    expect(onAllowedSite("berea-menu.thelandingdispensaries.com")).toBe(true);
    expect(onAllowedSite("WWW.TheLandingInOhio.com.")).toBe(true);
  });

  test("not a lookalike, a listed name under another domain, a shared platform, or nothing", () => {
    expect(onAllowedSite("notthelandingdispensaries.com")).toBe(false);
    expect(onAllowedSite("thelandingdispensaries.com.evil.example")).toBe(false);
    expect(onAllowedSite("dutchie.com")).toBe(false);
    expect(onAllowedSite("")).toBe(false);
  });

  test("a list passed in replaces the built-in one", () => {
    expect(onAllowedSite("shop.example.com", ["example.com"])).toBe(true);
    expect(onAllowedSite("thelandingdispensaries.com", ["example.com"])).toBe(false);
  });
});

describe("ALLOWED_SITES", () => {
  test("holds bare, lower-case domains (no scheme, path, port or www), each once", () => {
    ALLOWED_SITES.forEach((site) => expect(site).toMatch(/^(?!www\.)[a-z0-9-]+(\.[a-z0-9-]+)+$/));
    expect(new Set(ALLOWED_SITES).size).toBe(ALLOWED_SITES.length);
  });

  test("never lists a platform many companies share, which would turn it on for sites that aren't on the list", () => {
    const shared = ALLOWED_SITES.filter((site) =>
      SHARED_PLATFORMS.some((platform) => site === platform || site.endsWith(`.${platform}`)),
    );
    expect(shared).toEqual([]);
  });

  test("leaves out the sites taken off the rollout, and their subdomains", () => {
    expect(TAKEN_OFF.filter((site) => onAllowedSite(site) || onAllowedSite(`www.${site}`))).toEqual([]);
  });
});
