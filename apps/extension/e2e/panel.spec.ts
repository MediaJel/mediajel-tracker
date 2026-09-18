import { Page, expect, test } from "@playwright/test";
import { execFileSync } from "node:child_process";
import path from "node:path";

import { PREVIEW_PORT, Server, serveStatic } from "./servers";

/**
 * The visual matrix: every screen the side panel and the popup can show, in both themes, drawn
 * against the stubbed `chrome` in `stub/chrome-stub.js` and compared pixel for pixel with the
 * reference under `__screenshots__`. These are the "before" pictures of a UI rebuild: a change
 * that moves a pixel has to say so by updating them.
 *
 * The clock is pinned to the instant the stub's data is built around, so the recording's elapsed
 * time, "2 hours ago" and the day axis never move between runs.
 */

/** The stub's `NOW`. */
const FIXED_TIME = new Date("2026-09-16T15:00:00Z");
const THEMES = ["light", "dark"] as const;
type Theme = (typeof THEMES)[number];

interface Scenario {
  name: string;
  /** Which page to open; the side panel unless said otherwise. */
  page?: "sidepanel" | "popup";
  /** Selectors that must all be on screen before the picture is taken. */
  ready: string[];
  /** What to do after the page loads to reach the screen — a click, a sign-in. */
  act?(page: Page): Promise<void>;
}

const click =
  (selector: string) =>
  async (page: Page): Promise<void> => {
    await page.locator(selector).first().click();
  };

const answerSignIn = async (page: Page): Promise<void> => {
  await page.locator("input[autocomplete=username]").fill("j.doe");
  await page.locator("input[type=password]").fill("correct horse battery staple");
  await page.locator("button[type=submit]").click();
};

const openJobs = click("button[title='Your jobs']");
/** Open the first reading's configuration slip. */
const openConfig = click("[data-slot=tag-config-toggle]");
/** Choose a view by its tab. */
const openView = (view: "analytics" | "events" | "setup") => click(`[data-view=${view}]`);

/** The ledger with the tag's own record event opened into its receipt. */
const openRecord = async (page: Page): Promise<void> => {
  await openView("events")(page);
  await page.locator("[data-slot=ledger-row]", { hasText: "record" }).first().locator("button").first().click();
};

/** The ledger filtered to one family by its toggle. */
const filterEvents =
  (family: string) =>
  async (page: Page): Promise<void> => {
    await openView("events")(page);
    await page.locator("[data-slot=ledger-filter] button", { hasText: family }).first().click();
  };
/** The ledger with the other vendors' trackers opened. */
const openForeign = async (page: Page): Promise<void> => {
  await openView("events")(page);
  await page.locator("button", { hasText: "Other trackers on this page" }).first().click();
};

/** A job screen is ready when its section is drawn under the strip. */
const job = (selector: string): string[] => [selector, "[data-slot=view-tabs]"];
/** A job scenario lives on the setup view; the stub opens on Overview. */
const setup = (name: string, ready: string): Scenario => ({ name, ready: job(ready), act: openView("setup") });

const SCENARIOS: Scenario[] = [
  { name: "loading", ready: ["[data-slot=skeleton]"] },
  { name: "sign-in", ready: ["form input[autocomplete=username]"] },
  { name: "sign-in-challenge", ready: ["form input[inputmode=numeric]"], act: answerSignIn },
  { name: "no-site", ready: ["[data-slot=section-footer]"] },
  { name: "jobs-empty", ready: ["ol[aria-label='Your jobs'] p"], act: openJobs },
  { name: "jobs-3", ready: ["ol[aria-label='Your jobs'] li:nth-child(3)"], act: openJobs },
  setup("job-home", "[data-slot=goals]"),
  setup("job-recording", "[data-slot=rec]"),
  setup("job-review-suggest", "[data-slot=card]"),
  setup("job-review-pinpoint", "li[data-pinned]"),
  setup("job-generating", "[data-slot=working]"),
  setup("job-result", "table[aria-label='Field coverage']"),
  setup("job-verify-waiting", "[data-slot=working]"),
  setup("job-verify-ok", "[data-verdict=ok]"),
  setup("job-verify-problems", "li[data-bad]"),
  setup("job-deploy", "[data-slot=radio-group]"),
  setup("job-done", "[data-slot=links]"),
  { name: "settings", ready: ["[aria-label='Assistant settings']"], act: click("button[aria-label=Settings]") },
  { name: "confirm-reset", ready: ["[data-slot=alert-dialog-content]"], act: click("button[aria-label='Start over']") },
  { name: "overview-listening", ready: ["[data-slot=overview] [data-slot=tally-note]"] },
  { name: "overview-no-tags", ready: ["[data-slot=overview] [data-slot=tally-note]"] },
  { name: "overview-loading", ready: ["[data-slot=overview][aria-busy=true] [data-slot=skeleton]"] },
  { name: "overview-error", ready: ["[data-slot=overview] [data-slot=tally-note][data-problem]"] },
  { name: "overview-not-configured", ready: ["[data-slot=overview] [data-slot=tally-note]"] },
  { name: "overview-4-tags", ready: ["[data-slot=tally][data-many]"] },
  {
    name: "overview-refreshing",
    ready: ["[data-slot=tally][data-stale]"],
    act: click("[data-slot=tally-unread] button"),
  },
  { name: "overview-quiet-week", ready: ["[data-slot=tally-sentence]"] },
  { name: "overview-config", ready: ["[data-slot=tag-config] pre"], act: openConfig },
  { name: "config-script-only", ready: ["[data-slot=tag-config] pre"], act: openConfig },
  { name: "events-empty", ready: ["[data-slot=ledger-empty]"], act: openView("events") },
  { name: "events-live", ready: ["[data-slot=ledger-page] ~ [data-slot=ledger-page]"], act: openView("events") },
  { name: "events-detail", ready: ["[data-slot=ledger-detail] [data-slot=badge]"], act: openRecord },
  { name: "events-dropped", ready: ["[data-slot=ledger-dropped]"], act: openView("events") },
  { name: "events-error", ready: ["[data-slot=ledger-empty]"], act: openView("events") },
  { name: "events-partners", ready: ["[data-slot=ledger][data-family=partner]"], act: filterEvents("Partners") },
  { name: "events-custom-tag", ready: ["[data-slot=ledger][data-family=custom]"], act: filterEvents("Custom") },
  { name: "events-foreign", ready: ["[data-slot=ledger-foreign] [data-slot=ledger-row]"], act: openForeign },
  { name: "events-two-tags", ready: ["[data-slot=ledger][data-family=partner]"], act: filterEvents("Partners") },
  { name: "analytics-1", ready: ["[data-slot=analytics] [data-slot=chart] svg"], act: openView("analytics") },
  {
    name: "analytics-3",
    ready: ["[data-slot=analytics] [data-slot=alert]", "[data-slot=analytics] [data-slot=chart] svg"],
    act: openView("analytics"),
  },
  { name: "analytics-daily-null", ready: ["[data-slot=analytics] [data-slot=days] p"], act: openView("analytics") },
  { name: "analytics-listening", ready: ["[data-slot=analytics] [data-slot=tally-note]"], act: openView("analytics") },
  { name: "analytics-no-tags", ready: ["[data-slot=analytics] [data-slot=tally-note]"], act: openView("analytics") },
  {
    name: "analytics-error",
    ready: ["[data-slot=analytics] [data-slot=tally-note][data-problem]"],
    act: openView("analytics"),
  },
  {
    name: "analytics-not-configured",
    ready: ["[data-slot=analytics] [data-slot=tally-note]"],
    act: openView("analytics"),
  },
  { name: "popup-out", page: "popup", ready: ["form input[autocomplete=username]"] },
  { name: "popup-in", page: "popup", ready: ["dl"] },
];

let site: Server;

test.beforeAll(async () => {
  execFileSync(process.execPath, [path.join(__dirname, "build-preview.mjs")], { stdio: "inherit" });
  site = await serveStatic(path.join(__dirname, "out/site"), PREVIEW_PORT);
});

test.afterAll(async () => {
  await site?.close();
});

interface Media {
  colorScheme: Theme;
  reducedMotion?: "reduce" | "no-preference";
}

/** Opens a scenario's page with the clock pinned, reaches its screen, and waits for it to settle. */
const open = async (page: Page, scenario: Scenario, media: Media): Promise<void> => {
  await page.emulateMedia(media);
  await page.clock.setFixedTime(FIXED_TIME);
  const file = scenario.page ?? "sidepanel";
  await page.goto(`${site.url}/${file}.html?scenario=${scenario.name}&theme=${media.colorScheme}`);
  await scenario.act?.(page);
  for (const selector of scenario.ready) await page.locator(selector).first().waitFor();
  await page.evaluate(() => document.fonts.ready);
};

const disabledCount = (page: Page): Promise<number> =>
  page.evaluate(() => document.querySelectorAll("[disabled]").length);

for (const scenario of SCENARIOS) {
  for (const colorScheme of THEMES) {
    test(`${scenario.name} · ${colorScheme}`, async ({ page }) => {
      await open(page, scenario, { colorScheme });
      expect(await disabledCount(page), "nothing on the screen is disabled").toBe(0);
      await expect(page).toHaveScreenshot(`${scenario.name}-${colorScheme}.png`);
    });
  }
}

test("job-recording holds still under prefers-reduced-motion", async ({ page }) => {
  const recording = SCENARIOS.find((scenario) => scenario.name === "job-recording")!;
  await open(page, recording, { colorScheme: "light", reducedMotion: "reduce" });
  await page.waitForTimeout(100);
  const first = await page.screenshot({ animations: "allow" });
  await page.waitForTimeout(1900);
  const second = await page.screenshot({ animations: "allow" });
  expect(first.equals(second), "two seconds apart, nothing moved").toBe(true);
});
