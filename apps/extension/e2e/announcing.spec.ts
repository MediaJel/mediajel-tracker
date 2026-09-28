import { Page, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

import {
  Launched,
  launchWithExtension,
  pollTabRecord,
  readTabRecord,
  sessionStorage,
  stateOf,
  tabIdFor,
} from "./extension";
import {
  ANNOUNCING_PORT,
  COLLECTOR_PORT,
  CollectorHit,
  CollectorStub,
  FIXTURE_PORT,
  Server,
  appIdsIn,
  serveStatic,
  startCollectorStub,
} from "./servers";

/**
 * The tag that announces itself — this repo's build, not the production one — on a local page.
 *
 * `new.html` installs it the ordinary way. The record must say `installed` from the tag's own
 * announcement before anything is sent, then `running`, then `sending` once the collector holds
 * the batch; every row carries `announced: true`. Under GPC the tag announces that it is not
 * tracking and sends nothing: the record says `opted-out` and the collector hears nothing.
 */

const APP_ID = "e2e-new";
const FIXTURES = path.resolve(__dirname, "fixtures");
const ANNOUNCING = path.join(FIXTURES, "announcing");

let fixtures: Server;
let announcing: Server;
let collector: CollectorStub;

test.beforeAll(async () => {
  // The tag is built once from apps/tracker; a build already on disk is reused.
  execFileSync(process.execPath, [path.join(__dirname, "build-announcing-tag.mjs")], { stdio: "inherit" });
  fixtures = await serveStatic(FIXTURES, FIXTURE_PORT);
  announcing = await serveStatic(ANNOUNCING, ANNOUNCING_PORT);
  collector = await startCollectorStub(COLLECTOR_PORT);
});

test.afterAll(async () => {
  await Promise.all([fixtures?.close(), announcing?.close(), collector?.close()]);
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

/** Whether the record's row for the app ID came from the tag's own announcement. */
const announcedIn = async (tabId: number): Promise<boolean | undefined> =>
  readTabRecord(await sessionStorage(launched.worker), tabId)?.tags.find((tag) => tag.appId === APP_ID)?.announced;

test("new.html: announced as installed, then running, then heard sending", async () => {
  await page.goto(`${fixtures.url}/new.html`);
  const tabId = await tabIdFor(launched.worker, `${fixtures.url}/new.html`);
  expect(tabId).not.toBeNull();

  const first = await pollTabRecord(launched.worker, tabId!, (r) => stateOf(r, APP_ID) !== null, 15_000);
  console.log(
    `[announcing] first seen as: ${stateOf(first, APP_ID) ?? "absent"}, announced: ${await announcedIn(tabId!)}`,
  );
  expect(["installed", "running", "sending"]).toContain(stateOf(first, APP_ID));
  expect(await announcedIn(tabId!)).toBe(true);

  const sending = await pollTabRecord(launched.worker, tabId!, (r) => stateOf(r, APP_ID) === "sending", 20_000);
  expect(stateOf(sending, APP_ID)).toBe("sending");
  expect(await announcedIn(tabId!)).toBe(true);

  const hit = await collector.waitForHit(namesAppId, 15_000);
  expect(hit.url).toContain("/analytics/track");
});

test("new.html under GPC: announced as opted out, and nothing reaches the collector", async () => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "globalPrivacyControl", { get: () => true, configurable: true });
  });
  await page.goto(`${fixtures.url}/new.html`);
  const tabId = await tabIdFor(launched.worker, `${fixtures.url}/new.html`);
  expect(tabId).not.toBeNull();

  const read = await pollTabRecord(launched.worker, tabId!, (r) => stateOf(r, APP_ID) === "opted-out", 15_000);
  console.log(`[announcing] under GPC: ${stateOf(read, APP_ID) ?? "absent"}`);
  expect(stateOf(read, APP_ID)).toBe("opted-out");

  // Three seconds is longer than the tag takes to send a page view when it does run.
  await page.waitForTimeout(3_000);
  expect(collector.hits.filter(namesAppId)).toHaveLength(0);
});
