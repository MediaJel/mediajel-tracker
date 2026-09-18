import { Page, expect, test } from "@playwright/test";
import path from "node:path";

import type { TagActivity, TagActivityResponse } from "../src/service/client";
import {
  Launched,
  appIdsInView,
  askBackground,
  currentWorker,
  launchWithExtension,
  pollTabRecord,
  readEnvFile,
  readTabRecord,
  sessionStorage,
  stateOf,
  tabIdFor,
  valueOf,
} from "./extension";

/**
 * A real client site with the production tag on it, arriving late through Google Tag Manager
 * behind an age gate: everything the fixtures cannot stand in for.
 *
 * Every test launches its own browser, so a reload or a stopped worker in one can never be the
 * reason another saw what it saw. The collector host resolves to this machine for the whole run
 * (see `HOST_RULES`), so the page views these tests cause never reach MediaJel's pipeline.
 */

const SITE = "https://terrabis.co/";
const APP_ID = "5f976cbb-7d29-46ce-bf07-0f701478d800";
const ENV_FILE = path.resolve(__dirname, "../.env.e2e");
const SCREENSHOTS = path.resolve(__dirname, "__screenshots__");

/** The site asks every visitor to confirm they are of age; the tag waits behind that dialog. */
const dismissAgeGate = async (page: Page): Promise<void> => {
  const yes = page.locator("button.age-gate-submit-yes").first();
  const shown = await yes.waitFor({ state: "visible", timeout: 10_000 }).then(
    () => true,
    () => false,
  );
  console.log(`[terrabis] age gate ${shown ? "shown; confirming 21+" : "absent"}`);
  if (shown) await yes.click();
};

const openTerrabis = async (launched: Launched): Promise<{ page: Page; tabId: number }> => {
  const page = await launched.context.newPage();
  await page.goto(SITE, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await dismissAgeGate(page);
  const tabId = await tabIdFor(launched.worker, "https://terrabis.co");
  expect(tabId, "the terrabis tab is known to the extension").not.toBeNull();
  return { page, tabId: tabId! };
};

/** Waits for the tab's record to name the app ID at all, printing the state it was seen in. */
const expectTagKnown = async (launched: Launched, tabId: number): Promise<void> => {
  const read = await pollTabRecord(launched.worker, tabId, (r) => stateOf(r, APP_ID) !== null, 15_000);
  console.log(`[terrabis] ${APP_ID} is ${stateOf(read, APP_ID) ?? "absent"}`);
  expect(stateOf(read, APP_ID)).not.toBeNull();
};

const openJob = async (launched: Launched, extensionId: string, tabId: number): Promise<string[]> => {
  const view = valueOf(await askBackground(launched.context, extensionId, { type: "job/open", tabId }));
  const appIds = appIdsInView(view);
  console.log(`[terrabis] job/open names: ${appIds.join(", ") || "no tag"}`);
  return appIds;
};

test("detection: the tag is found, then heard sending, and job/open names it", async () => {
  const launched = await launchWithExtension();
  try {
    const { tabId } = await openTerrabis(launched);
    await expectTagKnown(launched, tabId);

    const sending = await pollTabRecord(launched.worker, tabId, (r) => stateOf(r, APP_ID) === "sending", 30_000);
    expect(stateOf(sending, APP_ID), "the page view was heard").toBe("sending");

    expect(await openJob(launched, launched.extensionId, tabId)).toContain(APP_ID);
  } finally {
    await launched.close();
  }
});

/** Which screen the panel settled on: the tally, or the plain frame saying the tab has no site. */
const panelOutcome = async (panel: Page): Promise<"bound" | "no-site" | "other"> => {
  const noSite = "p:has-text('not on a website')";
  await panel.locator(`[data-slot=tally], [data-slot=tally-note], ${noSite}`).first().waitFor({ timeout: 30_000 });
  if ((await panel.locator("[data-slot=tally], [data-slot=tally-note]").count()) > 0) return "bound";
  return (await panel.locator(noSite).count()) > 0 ? "no-site" : "other";
};

const screenshotBothThemes = async (panel: Page): Promise<void> => {
  for (const colorScheme of ["light", "dark"] as const) {
    await panel.emulateMedia({ colorScheme });
    await panel.evaluate(() => document.fonts.ready);
    await panel.screenshot({ path: path.join(SCREENSHOTS, `terrabis-${colorScheme}.png`) });
  }
};

interface Credentials {
  username: string;
  password: string;
}

/** The operator's e2e account, from the gitignored env file — or null, which skips the signed-in run. */
const credentials = (): Credentials | null => {
  const env = readEnvFile(ENV_FILE);
  if (!env?.MJ_E2E_USERNAME || !env.MJ_E2E_PASSWORD) return null;
  return { username: env.MJ_E2E_USERNAME, password: env.MJ_E2E_PASSWORD };
};

const expectSignedIn = async (launched: Launched, account: Credentials): Promise<void> => {
  const auth = valueOf(
    await askBackground(launched.context, launched.extensionId, { type: "auth/sign-in", ...account }),
  );
  expect(auth.identity, "the sign-in produced an identity").not.toBeNull();
};

/** The first tag's activity, which must have been read. */
const okActivity = (activity: TagActivityResponse): Extract<TagActivity, { status: "ok" }> => {
  const first = activity.tags[0];
  expect(first?.status).toBe("ok");
  return first as Extract<TagActivity, { status: "ok" }>;
};

const expectActivityReadable = async (launched: Launched): Promise<void> => {
  const { context, extensionId } = launched;
  const request = { type: "service/tag-activity" as const, appIds: [APP_ID] };
  const first = okActivity(valueOf(await askBackground(context, extensionId, request)));
  expect(typeof first.totals.pageviews).toBe("number");
  console.log(
    `[terrabis] tag activity: ${first.totals.pageviews} page views; daily rows: ${first.daily?.length ?? "null"}`,
  );
  if (first.daily) expect(first.daily).toHaveLength(8);
};

/**
 * Opens the panel for the tab and says whether it bound to it. The current build's panel follows the
 * active tab; the target one binds to `?tab=`. Making the site's tab active satisfies both, and the
 * outcome says which seam this build has.
 */
const openPanelFor = async (launched: Launched, tabId: number, site: Page): Promise<string> => {
  const panel = await launched.context.newPage();
  await panel.goto(`chrome-extension://${launched.extensionId}/sidepanel.html?tab=${tabId}`);
  await site.bringToFront();
  const outcome = await panelOutcome(panel);
  console.log(`[terrabis] panel bound to the tab: ${outcome === "bound" ? "yes" : `no (${outcome})`}`);
  await screenshotBothThemes(panel);
  return outcome;
};

test("panel: signed in, the tally reads the site's activity", async () => {
  const account = credentials();
  test.skip(
    !account,
    "apps/extension/.env.e2e with MJ_E2E_USERNAME and MJ_E2E_PASSWORD is not present, so the signed-in panel run is skipped.",
  );

  const launched = await launchWithExtension();
  try {
    const { page, tabId } = await openTerrabis(launched);
    await expectSignedIn(launched, account!);
    await expectActivityReadable(launched);
    expect(await openPanelFor(launched, tabId, page)).toBe("bound");
  } finally {
    await launched.close();
  }
});

test("worker restart: the record outlives the service worker", async () => {
  const launched = await launchWithExtension();
  try {
    const { page, tabId } = await openTerrabis(launched);
    await expectTagKnown(launched, tabId);

    const cdp = await launched.context.newCDPSession(page);
    await cdp.send("ServiceWorker.enable");
    await cdp.send("ServiceWorker.stopAllWorkers");
    console.log("[terrabis] stopped every service worker");

    expect(await openJob(launched, launched.extensionId, tabId)).toContain(APP_ID);
    const worker = await currentWorker(launched.context);
    const after = readTabRecord(await sessionStorage(worker), tabId);
    console.log(`[terrabis] after the restart ${APP_ID} is ${stateOf(after, APP_ID) ?? "absent"}`);
    expect(stateOf(after, APP_ID)).not.toBeNull();
  } finally {
    await launched.close();
  }
});

test("no-reload: the tab's record is still served after the extension reloads", async () => {
  const launched = await launchWithExtension();
  try {
    const { tabId } = await openTerrabis(launched);
    await expectTagKnown(launched, tabId);

    await launched.worker
      .evaluate(() => chrome.runtime.reload())
      .catch((err: Error) => console.log(`[terrabis] chrome.runtime.reload(): ${err.message.split("\n")[0]}`));
    const next = await launched.context.waitForEvent("serviceworker", { timeout: 15_000 }).catch(() => null);
    const outcome = next ? "a new service worker started" : "no service worker came back";
    console.log(`[terrabis] after reload: ${outcome}`);
    test.skip(
      !next,
      "Headless Chrome unloads a command-line extension on chrome.runtime.reload(), so attach-on-install cannot be observed here.",
    );

    const appIds = await openJob(launched, new URL(next!.url()).host, tabId);
    expect.soft(appIds, "the reloaded extension still knows the tab's tag").toContain(APP_ID);
  } finally {
    await launched.close();
  }
});
