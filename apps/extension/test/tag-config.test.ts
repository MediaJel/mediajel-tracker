import { describe, expect, test } from "bun:test";

import { TagRecord } from "@mediajel/assistant-core/tags";

import { configurationOf } from "~/ui/tag-config";

/**
 * The configuration slip's words. A tag's segment defaults, legacy names and unknown parameters
 * must each be said for what they are — a "00000" printed as a real Dstillery segment would send an
 * engineer chasing a partner setup that was never made.
 */

const record = (overrides: Partial<TagRecord> = {}): TagRecord => ({
  appId: "5f976cbb-7d29-46ce-bf07-0f701478d800",
  state: "sending",
  environment: "dutchie",
  version: "2",
  event: "",
  announced: false,
  firstSeenAt: 0,
  collector: "collector-azsx401.dmp.cnna.io",
  enabled: true,
  config: null,
  lastHeardAt: null,
  ...overrides,
});

const TERRABIS = {
  s1: "bLeKC3ply8HYzQ1WC-afAA",
  "s2.pv": "ezo6F0p8rYhy9c9uKtSeTQjLfH45uPUaXTGYvQTA2A818HALmoXU-lKMrHkaIZ8l8XJzHZm-oJxYQYPOORkJTA",
  "s2.tr": "bVey-hiFRY1Tq2HrHnGsOqQrh6apKbHbwiypP3zNsvo18HALmoXU-lKMrHkaIZ8l_Q0VOzqICYfRNqJW95UEig",
  "s3.pv": "TerrabisMundelein-S3.PV",
  "s3.tr": "TerrabisMundelein-S3.TR",
  plugin: "googleAds",
  conversionId: "AW-17979043318",
  conversionLabel: "w-syCL2KyYUcEPbbif1C",
};

const titles = (tag: TagRecord): string[] => configurationOf(tag)!.groups.map((group) => group.title);
const entry = (tag: TagRecord, label: string) =>
  configurationOf(tag)!
    .groups.flatMap((group) => group.entries)
    .find((candidate) => candidate.label === label);

describe("the configuration slip", () => {
  test("a tag heard only on the wire has no slip — its line already says the page names nothing", () => {
    expect(configurationOf(record())).toBeNull();
  });

  test("a terrabis-shaped tag from its record event: every group, in order, with the SDK its version implies", () => {
    const tag = record({
      config: {
        params: TERRABIS,
        src: "https://tags.cnna.io/?appId=5f976cbb",
        element: "<script src=…>",
        source: "record",
      },
    });
    expect(titles(tag)).toEqual(["Identity", "Audience segments", "Plugins", "Controls"]);
    expect(entry(tag, "Version")?.value).toBe("2 · cnna.js, Snowplow 3.22");
    expect(entry(tag, "Collector")?.value).toBe("collector-azsx401.dmp.cnna.io");
    expect(entry(tag, "Event")?.value).toBe("not set");
    expect(entry(tag, "Nexxen transaction beacon")?.value).toBe(TERRABIS["s2.tr"]);
    expect(entry(tag, "Dstillery page-view")).toEqual({
      label: "Dstillery page-view",
      value: "TerrabisMundelein-S3.PV",
      note: undefined,
    });
    expect(entry(tag, "Google Ads conversion ID")?.value).toBe("AW-17979043318");
    expect(entry(tag, "Enabled")?.value).toBe("yes");
    expect(configurationOf(tag)!.source).toBe("From the tag’s own record event, after any overrides on the page.");
    expect(configurationOf(tag)!.markup).toBe("<script src=…>");
  });

  test("a segment the tag defaulted is said to be unconfigured, and a legacy name is named", () => {
    const tag = record({
      version: "1",
      environment: "",
      config: {
        params: { segmentId: "e-oqTEY2SNGlRzvmH9esjw", "s3.pv": "00000", "s3.tr": "00000" },
        src: "",
        element: "",
        source: "script",
      },
    });
    expect(entry(tag, "Version")?.value).toBe("1 · sp.js, Snowplow 2.14");
    expect(entry(tag, "Environment")).toEqual({ label: "Environment", value: "production", note: "default" });
    expect(entry(tag, "LiquidM segment")).toEqual({
      label: "LiquidM segment",
      value: "e-oqTEY2SNGlRzvmH9esjw",
      legacy: "segmentId",
    });
    expect(entry(tag, "Dstillery page-view")?.note).toBe("not configured (tag default)");
    expect(configurationOf(tag)!.source).toBe("From the script on the page.");
  });

  test("unknown parameters land under Other, sorted, and the markup falls back to the script URL", () => {
    const tag = record({
      enabled: false,
      config: {
        params: { zeta: "1", alpha: "2", logs: "false", tag: "<script>", mediajelAppId: "x" },
        src: "https://tags.cnna.io/?appId=x",
        element: "",
        source: "announcement",
      },
    });
    const view = configurationOf(tag)!;
    expect(titles(tag)).toEqual(["Identity", "Controls", "Other parameters"]);
    expect(view.groups.find((group) => group.title === "Other parameters")?.entries.map((e) => e.label)).toEqual([
      "alpha",
      "zeta",
    ]);
    expect(entry(tag, "Enabled")?.value).toBe("no (enable=false)");
    expect(entry(tag, "Logging")?.value).toBe("false");
    expect(view.source).toBe("From the tag’s announcement.");
    expect(view.markup).toBe("https://tags.cnna.io/?appId=x");
  });
});
