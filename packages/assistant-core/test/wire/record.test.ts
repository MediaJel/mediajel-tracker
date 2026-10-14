import { describe, expect, test } from "bun:test";

import { recordedTagOf } from "@mediajel/assistant-core/wire/record";

import { APP_ID, RECORD_DATA, RECORD_SCHEMA, TAG_SRC } from "./fixtures";

/**
 * The tag's own word on its configuration, as its record event states it. The terrabis.co shape
 * is the v2 tag with every segment and plugin set; the unity-rd one the v1 tag with a legacy name.
 */

const TERRABIS = {
  appId: "5f976cbb-7d29-46ce-bf07-0f701478d800",
  environment: "dutchie",
  version: "2",
  collector: "//collector-azsx401.dmp.cnna.io",
  s1: "bLeKCx2Vm0S5qAaJ7dE1fw",
  "s2.pv": "ezo6F0kqQm2p",
  "s2.tr": "bVey-3fRZmk1",
  "s3.pv": "TerrabisMundelein-S3.PV",
  "s3.tr": "TerrabisMundelein-S3.TR",
  plugin: "googleAds",
  conversionId: "AW-17979043318",
  conversionLabel: "w-syCLbq3f0bEPbW8ZQB",
  tag: '<script src="https://tags.cnna.io/?appId=5f976cbb-7d29-46ce-bf07-0f701478d800&environment=dutchie"></script>',
};

describe("the record event", () => {
  test("lifts what the record names on its own, and keeps every other parameter as the tag reads it", () => {
    const recorded = recordedTagOf({ schema: RECORD_SCHEMA, data: TERRABIS })!;
    expect(recorded).toMatchObject({
      appId: TERRABIS.appId,
      environment: "dutchie",
      version: "2",
      event: "",
      collector: "collector-azsx401.dmp.cnna.io",
      config: { src: "", element: TERRABIS.tag, source: "record" },
    });
    expect(Object.keys(recorded.config.params).sort()).toEqual(
      ["conversionId", "conversionLabel", "plugin", "s1", "s2.pv", "s2.tr", "s3.pv", "s3.tr"].sort(),
    );
    expect(recorded.config.params["s2.pv"]).toBe("ezo6F0kqQm2p");
  });

  test("the unity-rd record: a v1 tag with the legacy segment name", () => {
    expect(recordedTagOf({ schema: RECORD_SCHEMA, data: RECORD_DATA })).toEqual({
      appId: APP_ID,
      environment: "dutchie-subdomain",
      version: "1",
      event: "",
      collector: "collector-azsx401.dmp.cnna.io",
      config: {
        params: { segmentId: "e-oqTEY2SNGlRzvmH9esjw" },
        src: "",
        element: `<script src="${TAG_SRC}"></script>`,
        source: "record",
      },
    });
  });

  test("the tag's default 00000 is kept as the value it is; non-strings are written as text", () => {
    const recorded = recordedTagOf({
      schema: RECORD_SCHEMA,
      data: { appId: "acme", "s3.pv": "00000", "s3.tr": "00000", logs: false, test: 1, event: "transaction" },
    })!;
    expect(recorded.config.params).toEqual({ "s3.pv": "00000", "s3.tr": "00000", logs: "false", test: "1" });
    expect(recorded.event).toBe("transaction");
  });

  test("the collector is kept as a host, whichever way the tag wrote it", () => {
    const host = (collector: string) =>
      recordedTagOf({ schema: RECORD_SCHEMA, data: { appId: "a", collector } })!.collector;
    expect(host("//collector-azsx401.dmp.cnna.io")).toBe("collector-azsx401.dmp.cnna.io");
    expect(host("https://collector.dmp.cnna.io/analytics/track")).toBe("collector.dmp.cnna.io");
    expect(host("collector.dmp.cnna.io")).toBe("collector.dmp.cnna.io");
    expect(host("")).toBe("");
  });

  test("the script's markup is capped; an earlier revision of the schema still matches", () => {
    const tag = `<script src="https://tags.cnna.io/?appId=a&pad=${"x".repeat(5_000)}"></script>`;
    const recorded = recordedTagOf({
      schema: "iglu:com.mediajel.events/record/jsonschema/1-0-1",
      data: { appId: "a", tag },
    })!;
    expect(recorded.config.element).toHaveLength(2_048);
    expect(recorded.config.params).toEqual({});
  });

  test("any other event, a record with no app ID, or data that is not an object is no record", () => {
    expect(
      recordedTagOf({ schema: "iglu:com.mediajel.events/sign_up/jsonschema/1-0-0", data: { appId: "a" } }),
    ).toBeNull();
    expect(
      recordedTagOf({ schema: "iglu:com.mediajel.events/record/jsonschema/2-0-0", data: { appId: "a" } }),
    ).toBeNull();
    expect(recordedTagOf({ schema: RECORD_SCHEMA, data: { version: "2" } })).toBeNull();
    expect(recordedTagOf({ schema: RECORD_SCHEMA, data: ["appId"] })).toBeNull();
    expect(recordedTagOf({ schema: RECORD_SCHEMA, data: "appId=a" })).toBeNull();
  });
});
