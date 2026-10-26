/**
 * Storage formats (src/shared/google-click-ids/codec.ts): our own cookie, and the values Google's tag writes.
 * The Google fixtures are the exact values live gtag.js stored in a headless-Chromium probe (2026-10-26):
 * ?gclid= → _gcl_aw, ?wbraid= → _gcl_gb, ?gbraid= → _gcl_ag, plus the _gcl_ls localStorage record.
 */
import { describe, expect, test } from "bun:test";

import {
  decodeOwnValue,
  decodePilotStorage,
  encodeOwnValue,
  formatGclCookie,
  parseGclAgCookie,
  parseGclCookie,
  parseGclLocalStorage,
} from "../../../src/shared/google-click-ids/codec";

const GCLID = "EAIaIQobChMItestGclidValue_1-2AbCdEfGh";
const GBRAID = "0AAAAAoTestGbraidValue12AbCd";
const WBRAID = "CjkKTestWbraidValue34AbCdEfGh";

describe("own cookie value", () => {
  test("encodes version, click time and the ids in a fixed order", () => {
    expect(encodeOwnValue({ ids: { gclid: GCLID }, ts: 1800000000 })).toBe(`1.1800000000.${GCLID}..`);
    expect(encodeOwnValue({ ids: { wbraid: WBRAID, gbraid: GBRAID }, ts: 1800000000 })).toBe(
      `1.1800000000..${GBRAID}.${WBRAID}`,
    );
  });

  test("decodes what it encodes", () => {
    expect(decodeOwnValue(`1.1800000000.${GCLID}..`)).toEqual({ ids: { gclid: GCLID }, ts: 1800000000 });
    expect(decodeOwnValue(`1.1800000000..${GBRAID}.${WBRAID}`)).toEqual({
      ids: { gbraid: GBRAID, wbraid: WBRAID },
      ts: 1800000000,
    });
  });

  test("rejects other versions, missing parts, invalid ids and junk", () => {
    expect(decodeOwnValue(`2.1800000000.${GCLID}..`)).toBeNull();
    expect(decodeOwnValue(`1..${GCLID}..`)).toBeNull();
    expect(decodeOwnValue("1.1800000000.bad id..")).toBeNull();
    expect(decodeOwnValue("1.1800000000...")).toBeNull();
    expect(decodeOwnValue("garbage")).toBeNull();
    expect(decodeOwnValue(null)).toBeNull();
  });
});

describe("Google's cookies", () => {
  test("reads _gcl_aw / _gcl_gb values (GCL.<seconds>.<id>)", () => {
    expect(parseGclCookie(`GCL.1793047287.${GCLID}`)).toEqual({ id: GCLID, ts: 1793047287 });
    expect(parseGclCookie(`GCL.1793047300.${WBRAID}`)).toEqual({ id: WBRAID, ts: 1793047300 });
  });

  test("does not mistake the _gcl_au linker id or junk for a click", () => {
    expect(parseGclCookie("1.1.880990388.1793047238")).toBeNull();
    expect(parseGclCookie("GCL.notanumber.EAIaIQobChMI")).toBeNull();
    expect(parseGclCookie(null)).toBeNull();
  });

  test("reads the versioned _gcl_ag gbraid value", () => {
    expect(parseGclAgCookie(`2.1.k${GBRAID}$i1793047294`)).toEqual({ id: GBRAID, ts: 1793047294 });
    expect(parseGclAgCookie(`GCL.1793047294.${GBRAID}`)).toBeNull();
    expect(parseGclAgCookie(null)).toBeNull();
  });

  test("reads the gclid from gtag's _gcl_ls localStorage record", () => {
    const record =
      '{"schema":"gcl","version":1,"gcl_ctr":{"value":{"value":0,"timeouts":0,"errors":0,"eopCount":0,' +
      '"creationTimeMs":1793047237612},"expires":1800823237612},"gclid":{"value":{"value":"' +
      GCLID +
      '","creationTimeMs":1793047237614,"linkDecorationSources":2},"expires":1800823237614}}';
    expect(parseGclLocalStorage(record)).toEqual({ id: GCLID, ts: 1793047237 });
    expect(parseGclLocalStorage('{"schema":"gcl","version":1}')).toBeNull();
    expect(parseGclLocalStorage("{not json")).toBeNull();
  });

  test("formats a seed value the way gtag writes _gcl_aw", () => {
    expect(formatGclCookie(1793047287, GCLID)).toBe(`GCL.1793047287.${GCLID}`);
  });
});

describe("Shangri-La pilot localStorage (mediajel_google_click_ids)", () => {
  test("recovers the ids and the click time from the 90-day expiry", () => {
    const expiresMs = (1800000000 + 90 * 24 * 60 * 60) * 1000;
    expect(decodePilotStorage(JSON.stringify({ ids: { gclid: GCLID }, expires: expiresMs }))).toEqual({
      ids: { gclid: GCLID },
      ts: 1800000000,
    });
  });

  test("ignores malformed records", () => {
    expect(decodePilotStorage('{"ids":{},"expires":1}')).toBeNull();
    expect(decodePilotStorage('{"ids":{"gclid":"x"}}')).toBeNull();
    expect(decodePilotStorage("nope")).toBeNull();
    expect(decodePilotStorage(null)).toBeNull();
  });
});
