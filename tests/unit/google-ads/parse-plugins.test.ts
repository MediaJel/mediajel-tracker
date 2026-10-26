/**
 * Plugin selection from the tag's query string (src/shared/utils/parse-plugins.ts). The help-center docs and some
 * override files wrote `plugins=googleAds`, which the tracker ignored, so those tags never sent Google conversions.
 */
import { describe, expect, test } from "bun:test";

import { parsePlugins } from "../../../src/shared/utils/parse-plugins";

describe("parsePlugins", () => {
  test.each([
    ["plugin", { plugin: "googleAds" }, ["googleAds"]],
    ["the plugins alias", { plugins: "googleAds" }, ["googleAds"]],
    ["both params", { plugin: "bingAds", plugins: "googleAds" }, ["bingAds", "googleAds"]],
    ["mixed case and spaces", { plugin: " googleads , BINGADS " }, ["googleAds", "bingAds"]],
    ["duplicates", { plugin: "googleAds,googleAds", plugins: "googleAds" }, ["googleAds"]],
    ["unknown names", { plugin: "tiktokAds,googleAds" }, ["googleAds"]],
    ["nothing", {}, []],
  ])("%s", (_, context, expected) => {
    expect(parsePlugins(context as any)).toEqual(expected);
  });
});
