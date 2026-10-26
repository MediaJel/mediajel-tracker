/**
 * Outbound link decoration (src/shared/google-click-ids/decorate.ts → decorateHref): which links get the click ID
 * and exactly how it is added. Expected hrefs are written out by hand; the site's own text must survive unchanged.
 */
import { describe, expect, test } from "bun:test";

import { decorateHref, PageScope } from "../../../src/shared/google-click-ids/decorate";

const G = "EAIaIQobChMItestGclid_1-2";
const page: PageScope = { hostname: "shop.example.com", cookieDomain: "example.com" };
const gclid = { gclid: G };
const decorate = (raw: string, resolved = raw.trim(), ids = gclid, scope = page) =>
  decorateHref(raw, resolved, ids, scope);

describe("decorateHref adds the click ID to outbound links", () => {
  test.each([
    ["https://dutchie.com/stores/x", `https://dutchie.com/stores/x?gclid=${G}`],
    ["https://dutchie.com/stores/x?menu=rec", `https://dutchie.com/stores/x?menu=rec&gclid=${G}`],
    ["https://dutchie.com/stores/x?", `https://dutchie.com/stores/x?gclid=${G}`],
    ["https://dutchie.com/stores/x?a=1&", `https://dutchie.com/stores/x?a=1&gclid=${G}`],
    ["https://dutchie.com/x?a=1#menu", `https://dutchie.com/x?a=1&gclid=${G}#menu`],
    ["https://dutchie.com/x#top", `https://dutchie.com/x?gclid=${G}#top`],
    ["https://x.example.org/#/route?a=1", `https://x.example.org/?gclid=${G}#/route?a=1`],
    ["https://dutchie.com/s?q=a%20b+c&n=%E2%9C%93", `https://dutchie.com/s?q=a%20b+c&n=%E2%9C%93&gclid=${G}`],
    ["https://notexample.com/", `https://notexample.com/?gclid=${G}`],
    ["  https://dutchie.com/x  ", `https://dutchie.com/x?gclid=${G}`],
  ])("%s", (raw, expected) => {
    expect(decorate(raw)).toBe(expected);
  });

  test("adds gbraid and wbraid in a fixed order", () => {
    expect(decorate("https://dutchie.com/x", undefined, { wbraid: "CjkKTestWbraid34", gbraid: "0AAAAAoTestGbraid12" })).toBe(
      "https://dutchie.com/x?gbraid=0AAAAAoTestGbraid12&wbraid=CjkKTestWbraid34",
    );
  });

  test("keeps a protocol-relative href protocol-relative", () => {
    expect(decorate("//dutchie.com/x", "https://dutchie.com/x")).toBe(`//dutchie.com/x?gclid=${G}`);
  });

  test("uses the resolved URL when a relative href points off-site (a <base> element)", () => {
    expect(decorate("/menu", "https://other.example.net/menu")).toBe(`https://other.example.net/menu?gclid=${G}`);
  });
});

describe("decorateHref leaves these links alone", () => {
  test.each([
    ["the same site", "https://www.example.com/menu"],
    ["the cookie's own domain", "https://example.com/"],
    ["the current host", "https://shop.example.com/x"],
    ["mailto", "mailto:orders@example.org"],
    ["tel", "tel:+15555550100"],
    ["javascript", "javascript:void(0)"],
    ["a link that already has a gclid", "https://dutchie.com/?gclid=OTHERCLICK123"],
    ["a link that already has a gbraid (any case)", "https://dutchie.com/?GBRAID=OTHERCLICK123"],
    ["an S3 pre-signed URL", "https://b.s3.amazonaws.com/f.pdf?X-Amz-Signature=abc&X-Amz-Date=1"],
    ["a GCS signed URL", "https://storage.googleapis.com/f?X-Goog-Signature=abc"],
    ["a sig= URL", "https://cdn.example.org/a?sig=abc"],
    ["an OAuth redirect", "https://login.example.org/oauth?redirect_uri=https%3A%2F%2Fa.example"],
    ["a token= URL", "https://example.org/?token=abc"],
  ])("%s", (_, raw) => {
    expect(decorate(raw)).toBeNull();
  });

  test("a URL that would exceed 8000 characters", () => {
    expect(decorate(`https://dutchie.com/?q=${"a".repeat(7990)}`)).toBeNull();
  });

  test("no click ids to add", () => {
    expect(decorate("https://dutchie.com/x", undefined, {})).toBeNull();
  });

  test("an unparseable resolved URL", () => {
    expect(decorate("http://[bad", "http://[bad")).toBeNull();
  });
});

describe("carrying the click ID to the next route on the same site (carryInUrl)", () => {
  const here = "https://shop.example.com/menu?x=1";
  const carry: PageScope = { ...page, carryInUrl: true, pageUrl: here };
  const resolve = (raw: string) => new URL(raw, here).href;

  test.each([
    ["an absolute same-site link", "https://www.example.com/deals", `https://www.example.com/deals?gclid=${G}`],
    ["a relative link, which stays relative", "/checkout?step=1#pay", `/checkout?step=1&gclid=${G}#pay`],
    ["a bare relative path", "specials", `specials?gclid=${G}`],
  ])("decorates %s", (_, raw, expected) => {
    expect(decorate(raw, resolve(raw), gclid, carry)).toBe(expected);
  });

  test.each([
    ["an in-page #anchor", "#reviews"],
    ["an empty href", ""],
    ["a link to this same page and query (a scroll target)", "https://shop.example.com/menu?x=1#reviews"],
    ["a same-site link that already carries a gclid", "/deals?gclid=OTHERCLICK123"],
  ])("leaves %s alone", (_, raw) => {
    expect(decorate(raw, resolve(raw), gclid, carry)).toBeNull();
  });
});

describe("scope rules", () => {
  test("with a host-only cookie, only the current host counts as the same site", () => {
    const local: PageScope = { hostname: "localhost", cookieDomain: null };
    expect(decorate("http://localhost:3000/x", undefined, gclid, local)).toBeNull();
    expect(decorate("https://dutchie.com/x", undefined, gclid, local)).toBe(`https://dutchie.com/x?gclid=${G}`);
  });

  test("linker mode decorates only the listed hosts and their subdomains", () => {
    const linker: PageScope = { ...page, onlyHosts: ["store-site.com"] };
    expect(decorate("https://dutchie.com/x", undefined, gclid, linker)).toBeNull();
    expect(decorate("https://www.store-site.com/x", undefined, gclid, linker)).toBe(
      `https://www.store-site.com/x?gclid=${G}`,
    );
  });
});
