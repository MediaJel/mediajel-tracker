import { Page, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { Launched, launchWithExtension, pollTabRecord, stateOf, tabIdFor } from "./extension";
import {
  COLLECTOR_PORT,
  CollectorHit,
  CollectorStub,
  FIXTURE_PORT,
  Server,
  VENDOR_PORT,
  appIdsIn,
  serveStatic,
  startCollectorStub,
} from "./servers";

/**
 * Two local pages carrying the production tag build, and what the extension makes of each.
 *
 * `old.html` installs the tag the ordinary way; `held.html` the way a page-speed plugin leaves it,
 * inert until the visitor's first interaction. Both must end the same way: the tag heard sending
 * events for its app ID, and the stub collector holding the batch that named it — the collector's
 * account, not the extension's, is what proves the page actually sent something.
 *
 * The record is the background's `tags/<tabId>`: a state per tag — `installed`, `held-back`,
 * `running`, `sending` — that only ever moves forward.
 */

const APP_ID = "e2e-old";
const FIXTURES = path.resolve(__dirname, "fixtures");
const VENDOR = path.join(FIXTURES, "vendor");

let fixtures: Server;
let vendor: Server;
let collector: CollectorStub;

test.beforeAll(async () => {
  // The production bundle is fetched once; a copy already on disk is reused.
  execFileSync(process.execPath, [path.join(__dirname, "vendor-tag.mjs")], { stdio: "inherit" });
  fixtures = await serveStatic(FIXTURES, FIXTURE_PORT);
  vendor = await serveStatic(VENDOR, VENDOR_PORT);
  collector = await startCollectorStub(COLLECTOR_PORT);
});

test.afterAll(async () => {
  await Promise.all([fixtures?.close(), vendor?.close(), collector?.close()]);
});

let launched: Launched;
let page: Page;

test.beforeEach(async () => {
  collector.hits.length = 0;
  launched = await launchWithExtension();
  page = await launched.context.newPage();
});

test.afterEach(async () => {
  await launched?.close();
});

const namesAppId = (hit: CollectorHit): boolean => hit.method === "POST" && appIdsIn(hit).includes(APP_ID);

/** Waits for the tag to be heard sending, and for the collector's copy of what it sent. */
const expectHeardSending = async (tabId: number): Promise<void> => {
  const read = await pollTabRecord(launched.worker, tabId, (r) => stateOf(r, APP_ID) === "sending", 20_000);
  console.log(`[fixtures] ${APP_ID} is ${stateOf(read, APP_ID) ?? "absent"}`);
  expect(stateOf(read, APP_ID)).toBe("sending");

  const hit = await collector.waitForHit(namesAppId, 15_000);
  expect(hit.url).toContain("/analytics/track");
  expect(appIdsIn(hit)).toContain(APP_ID);
};

test("old.html: the tag is heard sending, and the collector received its batch", async () => {
  await page.goto(`${fixtures.url}/old.html`);
  const tabId = await tabIdFor(launched.worker, `${fixtures.url}/old.html`);
  expect(tabId).not.toBeNull();

  // The tag is at least installed before it has sent anything.
  const early = await pollTabRecord(launched.worker, tabId!, (r) => stateOf(r, APP_ID) !== null, 15_000);
  console.log(`[fixtures] old.html first seen as: ${stateOf(early, APP_ID) ?? "absent"}`);
  expect(stateOf(early, APP_ID)).not.toBeNull();

  await expectHeardSending(tabId!);
});

test("held.html: nothing before the mouse moves, then the same", async () => {
  await page.goto(`${fixtures.url}/held.html`);
  const tabId = await tabIdFor(launched.worker, `${fixtures.url}/held.html`);
  expect(tabId).not.toBeNull();

  // Three seconds is longer than the tag takes to send a page view when it does run.
  const held = await pollTabRecord(launched.worker, tabId!, (r) => stateOf(r, APP_ID) === "sending", 3_000);
  console.log(`[fixtures] held.html before interaction: ${stateOf(held, APP_ID) ?? "absent"}`);
  expect(stateOf(held, APP_ID)).not.toBe("sending");
  expect(collector.hits.filter(namesAppId)).toHaveLength(0);

  await page.mouse.move(10, 10);
  await expectHeardSending(tabId!);
});
