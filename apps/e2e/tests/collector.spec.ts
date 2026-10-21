import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { expect, fixtureUrl, test } from "./fixtures";
import { named } from "../rig/micro";
import { RIG_URL } from "../playwright.config";

/**
 * The regression this whole suite exists for.
 *
 * `get-context.ts` resolves `collector: process.env.COLLECTOR_URL || ""`. Parcel inlines that at
 * build time, so when turbo's strict env mode dropped COLLECTOR_URL in CI (fixed in b8b29f56), the
 * tag shipped with an empty collector: it loaded, threw nothing, logged nothing unusual, and posted
 * every event into the void. Staging ran that way until somebody noticed events had stopped.
 *
 * Two assertions, because they fail for different reasons and a build can pass one and fail the
 * other: the value survived the BUILD (it is in the bundle), and the value survived into a REQUEST
 * (events arrive). The first localises the bug to turbo/Parcel; the second catches anything that
 * mangles the URL between the bundle and the wire.
 *
 * These run with NO window.overrides. Every other spec may point the collector wherever it likes;
 * this one must read what the build baked in, or it is not testing the bug.
 */

const TAG_BUNDLE = fileURLToPath(new URL("../../tracker/dist/index.js", import.meta.url));

test.describe("the collector the build baked in", () => {
  test("the bundle carries the configured collector, not an empty one", () => {
    const bundle = readFileSync(TAG_BUNDLE, "utf8");

    expect(
      bundle.includes(RIG_URL),
      `The tag at ${TAG_BUNDLE} does not contain ${RIG_URL}.\n` +
        `Build it with that collector first:  COLLECTOR_URL=${RIG_URL} bun x turbo run build --filter=mediajel-tracker`,
    ).toBe(true);

    // The shapes an unset COLLECTOR_URL leaves behind. `|| ""` means the tag still builds and still
    // runs — it just has nowhere to send anything, which is why this is a grep and not a crash.
    expect(bundle).not.toContain('collector:""');
    expect(bundle).not.toContain("collector:undefined");
    expect(bundle).not.toContain('collector:"undefined"');
  });

  test("a page with no overrides delivers its page view to that collector", async ({ page, micro }) => {
    await page.goto(fixtureUrl({ appId: "e2e-baked-collector", version: "2" }));
    await expect(page.locator("body")).toHaveAttribute("data-tag", "loaded");

    const events = await micro.waitFor(named("page_view"), "a page view from the baked-in collector");

    expect(events.some((e) => e.event?.app_id === "e2e-baked-collector")).toBe(true);
    expect(await micro.bad()).toHaveLength(0);
  });
});
