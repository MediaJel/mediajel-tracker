/**
 * Click-ID rules (src/shared/google-click-ids/click-ids.ts): what counts as a Google Ads click ID, how one is read
 * from a page URL, and which of several stored clicks wins. Run: `bun test tests`.
 */
import { describe, expect, test } from "bun:test";

import { clickIdsFromUrl, isValidClickId, pickLatest } from "../../../src/shared/google-click-ids/click-ids";

const NOW = 1_800_000_000; // seconds
const DAY = 24 * 60 * 60;
const GCLID = "EAIaIQobChMItestGclid_1-2AbC";

describe("isValidClickId", () => {
  test("accepts base64url-style ids", () => {
    expect(isValidClickId(GCLID)).toBe(true);
    expect(isValidClickId("0AAAAAoTestGbraid12")).toBe(true);
  });

  test("rejects anything that could carry markup, separators or junk", () => {
    expect(isValidClickId("")).toBe(false);
    expect(isValidClickId("short")).toBe(false);
    expect(isValidClickId("has space 123456")).toBe(false);
    expect(isValidClickId("<script>alert(1)</script>")).toBe(false);
    expect(isValidClickId("abc12345;path=/")).toBe(false);
    expect(isValidClickId("a".repeat(513))).toBe(false);
    expect(isValidClickId(undefined)).toBe(false);
  });
});

describe("clickIdsFromUrl", () => {
  test("reads gclid from the query string, ignoring other params", () => {
    expect(clickIdsFromUrl(`https://shop.example.com/?utm_source=google&gclid=${GCLID}`, NOW)).toEqual({
      ids: { gclid: GCLID },
      ts: NOW,
    });
  });

  test("reads gbraid and wbraid together", () => {
    expect(clickIdsFromUrl("https://x.example/p?gbraid=0AAAAAoTestGbraid12&wbraid=CjkKTestWbraid34", NOW)).toEqual({
      ids: { gbraid: "0AAAAAoTestGbraid12", wbraid: "CjkKTestWbraid34" },
      ts: NOW,
    });
  });

  test("reads ids from a hash-routed SPA URL", () => {
    expect(clickIdsFromUrl(`https://x.example/#/menu?gclid=${GCLID}`, NOW)).toEqual({ ids: { gclid: GCLID }, ts: NOW });
  });

  test("drops a gclid that belongs to a Search Ads 360 click (gclsrc without 'aw')", () => {
    expect(clickIdsFromUrl(`https://x.example/?gclid=${GCLID}&gclsrc=ds`, NOW)).toBeNull();
  });

  test("keeps a gclid whose gclsrc is a Google Ads source", () => {
    expect(clickIdsFromUrl(`https://x.example/?gclid=${GCLID}&gclsrc=aw.ds`, NOW)).toEqual({
      ids: { gclid: GCLID },
      ts: NOW,
    });
  });

  test("returns null for invalid values, no ids, or an unparseable URL", () => {
    expect(clickIdsFromUrl("https://x.example/?gclid=%3Cscript%3E", NOW)).toBeNull();
    expect(clickIdsFromUrl("https://x.example/?utm_source=google", NOW)).toBeNull();
    expect(clickIdsFromUrl("not a url", NOW)).toBeNull();
  });
});

describe("pickLatest", () => {
  test("a newer click with different ids replaces the older one", () => {
    const older = { ids: { gclid: GCLID }, ts: NOW - 10 * DAY };
    const newer = { ids: { gbraid: "0AAAAAoTestGbraid12" }, ts: NOW - DAY };
    expect(pickLatest([older, newer], NOW)).toEqual(newer);
  });

  test("seeing the same ids again keeps the original click time, so reloads never extend the window", () => {
    const stored = { ids: { gclid: GCLID }, ts: NOW - 30 * DAY };
    const reread = { ids: { gclid: GCLID }, ts: NOW };
    expect(pickLatest([reread, stored], NOW)).toEqual(stored);
  });

  test("clicks older than 90 days, from the future, or missing are ignored", () => {
    const expired = { ids: { gclid: GCLID }, ts: NOW - 91 * DAY };
    const future = { ids: { gclid: GCLID }, ts: NOW + DAY };
    expect(pickLatest([expired, future, null], NOW)).toBeNull();
  });

  test("a set holding an invalid id is ignored", () => {
    const forged = { ids: { gclid: "bad id;" }, ts: NOW - DAY };
    expect(pickLatest([forged], NOW)).toBeNull();
  });
});
