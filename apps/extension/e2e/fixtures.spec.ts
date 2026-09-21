import { Page, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

import type {
  CollectorEvent,
  CustomTagFetch,
  Partner,
  PartnerSignal,
  TabLedger,
} from "@mediajel/assistant-core/wire/types";

import {
  Launched,
  askBackground,
  launchWithExtension,
  pollTabLedger,
  pollTabRecord,
  stateOf,
  tabIdFor,
  valueOf,
} from "./extension";
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
 *
 * `old.html` also carries a segment for every partner, so the tag fires the partners' page-view
 * pixels. The ledger — the background's `events/<tabId>` — must hold one row per partner, each
 * decoded from the pixel's own URL and settled as never sent: every partner host resolves to this
 * machine, so nothing reaches one. And because the stub collector answers, the tag's own `record`
 * event follows its page view onto the ledger, carrying the configuration those segments came from.
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

const partnerRows = (ledger: TabLedger | null): PartnerSignal[] =>
  (ledger?.events ?? []).filter((event): event is PartnerSignal => event.source === "partner");

const customTagRows = (ledger: TabLedger | null): CustomTagFetch[] =>
  (ledger?.events ?? []).filter((event): event is CustomTagFetch => event.source === "custom-tag");

/** The tag's own record event for the fixture's app ID, once it is on the ledger. */
const recordRow = (ledger: TabLedger | null): CollectorEvent | undefined =>
  (ledger?.events ?? []).find(
    (event): event is CollectorEvent =>
      event.source === "collector" && event.name === "record" && event.appId === APP_ID,
  );

/** The three partners the fixture's segments make the tag fire on a page view. */
const PARTNERS: Partner[] = ["nexxen", "dstillery", "liquidm"];

const everyPartnerSettled = (ledger: TabLedger | null): boolean => {
  const rows = partnerRows(ledger);
  const partners = new Set(rows.map((row) => row.partner));
  return PARTNERS.every((partner) => partners.has(partner)) && rows.every((row) => row.outcome.kind !== "pending");
};

const bootOnLedger = (ledger: TabLedger | null): boolean =>
  everyPartnerSettled(ledger) && recordRow(ledger) !== undefined;

/**
 * Waits for the ledger to hold every partner's page-view pixel, decoded from its URL and settled
 * as never sent; the tag's record event, carrying the configuration the pixels came from; and the
 * custom-tag fetches, named for what they load.
 */
const expectPartnersInLedger = async (tabId: number): Promise<void> => {
  const ledger = await pollTabLedger(launched.worker, tabId, bootOnLedger, 20_000);
  const record = recordRow(ledger);
  console.log(`[fixtures] record event: ${record ? JSON.stringify(record.record?.config.params) : "absent"}`);
  expect(record?.record?.config.params).toMatchObject({
    "s3.pv": "e2e-dstillery-pv",
    "s2.pv": "e2e-nexxen-pv",
    s1: "e2e-liquidm",
  });
  expect(record?.record).toMatchObject({ appId: APP_ID, version: "2", environment: "jane" });

  const rows = partnerRows(ledger);
  console.log(
    `[fixtures] partner rows: ${rows.map((row) => `${row.partner}/${row.purpose} ${row.segment} → ${row.outcome.kind}`).join(", ") || "none"}`,
  );
  expect(new Set(rows.map((row) => row.partner))).toEqual(new Set(PARTNERS));
  for (const row of rows) expect(["blocked", "failed"]).toContain(row.outcome.kind);
  expect(rows.find((row) => row.partner === "nexxen")).toMatchObject({ purpose: "audience", segment: "e2e-nexxen-pv" });
  expect(rows.find((row) => row.partner === "dstillery")).toMatchObject({
    purpose: "audience",
    segment: "e2e-dstillery-pv",
    unconfigured: false,
  });
  expect(rows.find((row) => row.partner === "liquidm")).toMatchObject({ purpose: "sync", segment: "e2e-liquidm" });

  // The vendored bundle asks its custom-tag host for the site's file and the app ID's, when it has one.
  const custom = customTagRows(ledger);
  console.log(`[fixtures] custom-tag rows: ${custom.map((row) => `${row.scope} ${row.name}`).join(", ") || "none"}`);
  for (const row of custom) {
    expect(row).toMatchObject(
      row.scope === "domain" ? { name: "127.0.0.1", appId: "" } : { name: APP_ID, appId: APP_ID },
    );
  }
};

test("old.html: the tag is heard sending, the collector received its batch, and the partner pixels are on the ledger", async () => {
  await page.goto(`${fixtures.url}/old.html`);
  const tabId = await tabIdFor(launched.worker, `${fixtures.url}/old.html`);
  expect(tabId).not.toBeNull();

  // The tag is at least installed before it has sent anything.
  const early = await pollTabRecord(launched.worker, tabId!, (r) => stateOf(r, APP_ID) !== null, 15_000);
  console.log(`[fixtures] old.html first seen as: ${stateOf(early, APP_ID) ?? "absent"}`);
  expect(stateOf(early, APP_ID)).not.toBeNull();

  await expectHeardSending(tabId!);
  await expectPartnersInLedger(tabId!);
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

/** The same production bundle, installed by the simulator on a page that has no tag of its own. */
const SIMULATED_APP = "e2e-simulated";
const SIMULATED_URL = `http://127.0.0.1:${VENDOR_PORT}/index.js?appId=${SIMULATED_APP}&environment=jane&version=2`;

const badgeOf = (tabId: number): Promise<string> =>
  launched.worker.evaluate((id) => chrome.action.getBadgeText({ tabId: id }), tabId);

test("blank.html: a simulated tag loads on the page, is heard sending, reaches the collector, and pauses", async () => {
  await page.goto(`${fixtures.url}/blank.html`);
  const tabId = await tabIdFor(launched.worker, `${fixtures.url}/blank.html`);
  expect(tabId).not.toBeNull();

  const view = valueOf(
    await askBackground(launched.context, launched.extensionId, {
      type: "simulation/install",
      tabId: tabId!,
      url: SIMULATED_URL,
    }),
  );
  expect(view.simulation?.install?.appId).toBe(SIMULATED_APP);

  // The install reloads the tab; the new page is armed with the tag, which boots and sends.
  const read = await pollTabRecord(launched.worker, tabId!, (r) => stateOf(r, SIMULATED_APP) === "sending", 20_000);
  console.log(`[fixtures] simulated ${SIMULATED_APP} is ${stateOf(read, SIMULATED_APP) ?? "absent"}`);
  expect(stateOf(read, SIMULATED_APP)).toBe("sending");
  const hit = await collector.waitForHit((h) => h.method === "POST" && appIdsIn(h).includes(SIMULATED_APP), 15_000);
  expect(appIdsIn(hit)).toContain(SIMULATED_APP);
  expect(await page.locator("script[data-mj-simulated]").count()).toBe(1);
  expect(await badgeOf(tabId!)).toBe("SIM");

  // Paused, the next page carries nothing of it, and the toolbar stops saying so.
  valueOf(
    await askBackground(launched.context, launched.extensionId, {
      type: "simulation/pause",
      tabId: tabId!,
      enabled: false,
    }),
  );
  await page.waitForLoadState("load");
  await expect.poll(() => page.locator("script[data-mj-simulated]").count(), { timeout: 10_000 }).toBe(0);
  expect(await badgeOf(tabId!)).toBe("");

  const left = valueOf(
    await askBackground(launched.context, launched.extensionId, {
      type: "simulation/remove",
      site: "127.0.0.1",
      tabId: tabId!,
    }),
  );
  expect(left).toEqual([]);
});
