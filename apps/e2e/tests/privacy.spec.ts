import { expect, fixtureUrl, test } from "./fixtures";
import { named } from "../rig/micro";

/**
 * The opt-out gate, proved in both directions.
 *
 * `isUsPrivacyOptOut()` runs in the tag before adapters, Snowplow or cookies: GPC or DNT means the
 * tag returns and nothing is sent. An assertion for that is an assertion that NOTHING arrives, which
 * is the easiest kind of test to pass by accident — a broken rig, a stopped collector, a tag that
 * failed to load and a tag that correctly opted out all look identical from here.
 *
 * So each opt-out case is paired with a positive control on the same page and the same build, with
 * only the signal flipped. If the control stops arriving, the suite says so instead of quietly
 * reporting that privacy still works.
 */

const SETTLE_MS = 3_000;

test("the control: without an opt-out signal, the same page does send", async ({ page, micro }) => {
  await page.goto(fixtureUrl({ appId: "e2e-privacy-control", version: "2" }));

  const events = await micro.waitFor(named("page_view"), "a page view with no opt-out signal set");
  expect(events[0].event?.app_id).toBe("e2e-privacy-control");
});

test("Global Privacy Control stops the tag before it sends anything", async ({ page, micro }) => {
  // GPC is a navigator property the browser sets; Chromium has no flag for it, so define it the way
  // a GPC-enabled browser would present it, before any page script runs.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "globalPrivacyControl", { get: () => true, configurable: true });
  });

  await page.goto(fixtureUrl({ appId: "e2e-privacy-gpc", version: "2" }));
  await expect(page.locator("body")).toHaveAttribute("data-tag", "loaded");

  // The tag loaded and chose to do nothing. Waiting it out is the only honest assertion here:
  // there is no event to wait for, so the test has to give one time to show up and then look.
  expect(await micro.settle(SETTLE_MS)).toHaveLength(0);
});

test("Do Not Track stops the tag before it sends anything", async ({ page, micro }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "doNotTrack", { get: () => "1", configurable: true });
  });

  await page.goto(fixtureUrl({ appId: "e2e-privacy-dnt", version: "2" }));
  await expect(page.locator("body")).toHaveAttribute("data-tag", "loaded");

  expect(await micro.settle(SETTLE_MS)).toHaveLength(0);
});

test("an opted-out visitor sends nothing even on a transaction page", async ({ page, micro }) => {
  // The gate returns before adapters load, so the ecommerce entry points never exist. A page that
  // would otherwise fire a sale is the case that matters most commercially, and the one most likely
  // to be broken by someone moving the gate later.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "globalPrivacyControl", { get: () => true, configurable: true });
  });

  await page.goto(fixtureUrl({ appId: "e2e-privacy-transaction", version: "2", event: "transaction" }));
  await expect(page.locator("body")).toHaveAttribute("data-tag", "loaded");

  expect(await page.evaluate(() => typeof (window as never as { trackTrans?: unknown }).trackTrans)).toBe("undefined");
  expect(await micro.settle(SETTLE_MS)).toHaveLength(0);
});
