import { describe, expect, test } from "bun:test";

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { ENVIRONMENTS, SiteSimulation, commandOf, parseTagUrl } from "@mediajel/assistant-core/simulation";

/**
 * A pasted tag URL, read the way the tag reads its own — terrabis.co's and unity-rd.com's are the
 * two real ones — and the refusals said in words.
 */

const TERRABIS =
  "https://tags.cnna.io/?appId=5f976cbb-7d29-46ce-bf07-0f701478d800&environment=dutchie&s1=bLeKC3ply8HYzQ1WC-afAA&s3.pv=TerrabisMundelein-S3.PV&version=2&plugin=googleAds";
const UNITY =
  "https://tags.cnna.io/?segmentId=e-oqTEY2SNGlRzvmH9esjw&appId=5b677990-d3a8-49eb-9d18-15d686ad6e1a&environment=dutchie-subdomain";

describe("a pasted tag URL", () => {
  test("terrabis.co's: its app ID, and every parameter in the order the URL gives them", () => {
    const parsed = parseTagUrl(`  ${TERRABIS}  `);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.appId).toBe("5f976cbb-7d29-46ce-bf07-0f701478d800");
    expect(Object.keys(parsed.params)).toEqual(["appId", "environment", "s1", "s3.pv", "version", "plugin"]);
    expect(parsed.params["s3.pv"]).toBe("TerrabisMundelein-S3.PV");
  });

  test("unity-rd.com's v1 tag, named by a legacy segment parameter", () => {
    const parsed = parseTagUrl(UNITY);
    expect(parsed.ok && parsed.params.segmentId).toBe("e-oqTEY2SNGlRzvmH9esjw");
  });

  test("the legacy mediajelAppId names the tag wherever it is served from", () => {
    const parsed = parseTagUrl("https://cdn.example.com/tag.js?mediajelAppId=legacy-1");
    expect(parsed.ok && parsed.appId).toBe("legacy-1");
  });

  test("a slash inside a value is escaped, so the tag still finds its own files", () => {
    const parsed = parseTagUrl("https://tags.cnna.io/?appId=a&crossDomainSites=a.com/b");
    expect(parsed.ok && parsed.url).toBe("https://tags.cnna.io/?appId=a&crossDomainSites=a.com%2Fb");
    expect(parsed.ok && parsed.params.crossDomainSites).toBe("a.com/b");
  });

  test("a build's own tag host counts as MediaJel's", () => {
    expect(
      parseTagUrl("https://staging-tags.example.net/?appId=a", { origins: ["https://staging-tags.example.net"] }).ok,
    ).toBe(true);
  });

  test("refuses what it cannot simulate, and says why", () => {
    expect(parseTagUrl("tags.cnna.io/?appId=a")).toEqual({
      ok: false,
      reason: "Paste the tag's whole URL, starting with https://.",
    });
    expect(parseTagUrl("javascript:alert(1)")).toEqual({
      ok: false,
      reason: "Paste the tag's whole URL, starting with https://.",
    });
    expect(parseTagUrl("https://tags.cnna.io/?version=2")).toEqual({
      ok: false,
      reason: "The URL names no appId, so the tag would not start.",
    });
    expect(parseTagUrl("https://widget.example.com/loader.js?appId=a")).toEqual({
      ok: false,
      reason: "That isn't a MediaJel tag URL: it is served from widget.example.com.",
    });
  });

  test("an empty field has nothing to say yet", () => {
    expect(parseTagUrl("   ")).toEqual({ ok: false, reason: "" });
  });
});

describe("what a page is asked to load", () => {
  const simulation = (over: Partial<SiteSimulation> = {}): SiteSimulation => ({
    v: 1,
    site: "terrabis.co",
    enabled: true,
    install: { url: TERRABIS, appId: "5f976cbb-7d29-46ce-bf07-0f701478d800" },
    tried: {},
    updatedAt: 0,
    ...over,
  });
  const EDIT = { edits: { "s3.pv": "Tried" }, block: ";/* the block */", version: "v-0000abcd" };

  test("the simulated tag while the simulation runs, and nothing while it is paused or empty", () => {
    expect(commandOf(simulation())).toEqual({ install: TERRABIS, tried: {} });
    expect(commandOf(simulation({ enabled: false }))).toBeNull();
    expect(commandOf(simulation({ install: null }))).toBeNull();
    expect(commandOf(null)).toBeNull();
  });

  test("each tried edit's block and version, without the params the page has no use for", () => {
    expect(commandOf(simulation({ install: null, tried: { a: EDIT } }))).toEqual({
      install: null,
      tried: { a: { block: EDIT.block, version: EDIT.version } },
    });
  });
});

describe("the environments an edit can suggest", () => {
  test("are exactly the ones the tag has an adapter for", () => {
    const adapters = join(__dirname, "../../../apps/tracker/src/adapters");
    const labels = ["ecommerce.ts", "impressions.ts"].flatMap((file) =>
      Array.from(readFileSync(join(adapters, file), "utf8").matchAll(/case "([^"]+)"/g), (match) => match[1]),
    );
    expect([...ENVIRONMENTS].sort()).toEqual([...new Set(labels)].sort());
  });
});
