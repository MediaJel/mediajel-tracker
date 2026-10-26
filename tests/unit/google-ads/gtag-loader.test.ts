/**
 * gtag.js loader (src/shared/snowplow/extensions/gtag-loader.ts). The old code built the gtag.js <script> but never
 * added it to the page, so Google Ads conversions only reached Google on sites that loaded gtag/GTM themselves.
 */
import { describe, expect, test } from "bun:test";

import { ensureGtag } from "../../../src/shared/snowplow/extensions/gtag-loader";

const AW = "AW-123456789";

const fakePage = (scriptSrcs: string[] = [], win: any = {}) => {
  const scripts: any[] = scriptSrcs.map((src) => ({ tagName: "SCRIPT", src }));
  const doc: any = {
    head: { appendChild: (el: any) => scripts.push(el) },
    createElement: (tag: string) => ({ tagName: tag.toUpperCase(), src: "", async: false }),
    getElementsByTagName: (tag: string) => (tag === "script" ? scripts : []),
  };
  return { win, doc, scripts };
};

const isArguments = (value: unknown) => Object.prototype.toString.call(value) === "[object Arguments]";
const commands = (dataLayer: any[]) => dataLayer.map((entry) => Array.prototype.slice.call(entry, 0, 2));

describe("ensureGtag on a page without Google's tag", () => {
  test("adds one async gtag.js script for the conversion ID and configures it", () => {
    const { win, doc, scripts } = fakePage();
    ensureGtag(win, doc, AW);

    expect(scripts).toHaveLength(1);
    expect(scripts[0].src).toBe("https://www.googletagmanager.com/gtag/js?id=AW-123456789");
    expect(scripts[0].async).toBe(true);
    expect(commands(win.dataLayer).map((c: any[]) => c[0])).toEqual(["js", "config"]);
    expect(win.dataLayer[1][1]).toBe(AW);
  });

  test("pushes Arguments objects, the only shape gtag.js processes", () => {
    const { win, doc } = fakePage();
    ensureGtag(win, doc, AW);
    expect(win.dataLayer.every(isArguments)).toBe(true);
  });

  test("sets Google's cross-domain linker before config when domains are given", () => {
    const { win, doc } = fakePage();
    ensureGtag(win, doc, AW, ["a.example", "b.example"]);
    expect(commands(win.dataLayer).map((c: any[]) => c[0] + ":" + (typeof c[1] === "string" ? c[1] : ""))).toEqual([
      "js:",
      "set:linker",
      `config:${AW}`,
    ]);
    expect(win.dataLayer[1][2]).toEqual({ domains: ["a.example", "b.example"] });
  });

  test("a second call does not add a second script", () => {
    const { win, doc, scripts } = fakePage();
    ensureGtag(win, doc, AW);
    ensureGtag(win, doc, AW);
    expect(scripts).toHaveLength(1);
  });
});

describe("ensureGtag on a page that already has Google's tag", () => {
  test("keeps the site's own gtag function and does not re-send js", () => {
    const pushed: unknown[][] = [];
    const siteGtag = function gtag(...args: unknown[]) {
      pushed.push(args);
    };
    const { win, doc } = fakePage([], { dataLayer: [], gtag: siteGtag });
    ensureGtag(win, doc, AW);
    expect(win.gtag).toBe(siteGtag);
    expect(pushed).toEqual([["config", AW]]);
  });

  test("relies on an existing gtag.js that serves window.dataLayer", () => {
    const { win, doc, scripts } = fakePage(["https://www.googletagmanager.com/gtag/js?id=G-ABC123"]);
    ensureGtag(win, doc, AW);
    expect(scripts).toHaveLength(1);
  });

  test("still adds gtag.js when the existing one uses a renamed dataLayer", () => {
    const { win, doc, scripts } = fakePage(["https://www.googletagmanager.com/gtag/js?id=G-ABC123&l=siteLayer"]);
    ensureGtag(win, doc, AW);
    expect(scripts).toHaveLength(2);
  });

  test("relies on Google's runtime when this AW container is already loaded", () => {
    const { win, doc, scripts } = fakePage([], { google_tag_manager: { [AW]: {} } });
    ensureGtag(win, doc, AW);
    expect(scripts).toHaveLength(0);
  });

  test("does not send js when GTM already started the dataLayer", () => {
    const { win, doc } = fakePage([], { dataLayer: [{ event: "gtm.js", "gtm.start": 1 }] });
    ensureGtag(win, doc, AW);
    expect(commands(win.dataLayer.slice(1)).map((c: any[]) => c[0])).toEqual(["config"]);
  });
});

// gtag() pushes its Arguments object; build one the same way.
function gtagArgs(..._: unknown[]) {
  return arguments;
}

test("consent mode denying ad_storage: we add no gtag.js, and config waits for a tag the site loads after consent", () => {
  const { win, doc, scripts } = fakePage([], { dataLayer: [gtagArgs("consent", "default", { ad_storage: "denied" })] });
  ensureGtag(win, doc, AW);
  expect(scripts).toHaveLength(0);
  expect(commands(win.dataLayer).map((c: any[]) => c[0])).toEqual(["consent", "config"]);
});

test("an unusable dataLayer is left alone without throwing", () => {
  const { win, doc, scripts } = fakePage([], { dataLayer: { notAnArray: true } });
  expect(ensureGtag(win, doc, AW)).toBe(false);
  expect(scripts).toHaveLength(0);
  expect(win.gtag).toBeUndefined();
});
