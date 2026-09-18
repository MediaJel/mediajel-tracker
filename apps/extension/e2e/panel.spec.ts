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

const openDetails = click("#mj-activity-details");
const openJobs = click("button[title='Your jobs']");

/** A job screen is ready when its section is drawn and the tally has settled on a reading. */
const job = (selector: string): string[] => [selector, ".mj-tally-grid"];

const SCENARIOS: Scenario[] = [
  { name: "loading", ready: [".mj-skeleton"] },
  { name: "sign-in", ready: ["form.mj-signin input[autocomplete=username]"] },
  { name: "sign-in-challenge", ready: ["form.mj-signin .mj-input--mono"], act: answerSignIn },
  { name: "no-site", ready: [".mj-section-footer"] },
  { name: "jobs-empty", ready: ["ol[aria-label='Your jobs'] .mj-lede"], act: openJobs },
  { name: "jobs-3", ready: ["ol[aria-label='Your jobs'] .mj-job:nth-child(3)"], act: openJobs },
  { name: "job-home", ready: job(".mj-goals") },
  { name: "job-recording", ready: job(".mj-rec-row") },
  { name: "job-review-suggest", ready: job(".mj-guess") },
  { name: "job-review-pinpoint", ready: job(".mj-timeline .mj-tl--pinned") },
  { name: "job-generating", ready: job(".mj-working") },
  { name: "job-result", ready: job(".mj-coverage") },
  { name: "job-verify-waiting", ready: job(".mj-working") },
  { name: "job-verify-ok", ready: job(".mj-capture-verdict--ok") },
  { name: "job-verify-problems", ready: job(".mj-capture--bad") },
  { name: "job-deploy", ready: job(".mj-target-grid") },
  { name: "job-done", ready: job(".mj-links") },
  { name: "settings", ready: [".mj-settings"], act: click("button[aria-label=Settings]") },
  { name: "confirm-reset", ready: ["[data-slot=alert-dialog-content]"], act: click("button[aria-label='Start over']") },
  { name: "report-1", ready: ["#mj-activity-report .mj-days-plot svg"], act: openDetails },
  {
    name: "report-3",
    ready: ["#mj-activity-report .mj-report-unread", "#mj-activity-report .mj-days-plot svg"],
    act: openDetails,
  },
  { name: "tally-listening", ready: [".mj-goals", ".mj-tally-note"] },
  { name: "tally-no-tags", ready: [".mj-goals", ".mj-tally-note"] },
  { name: "tally-loading", ready: [".mj-goals", ".mj-tally[aria-busy=true] .mj-tally-skeleton"] },
  { name: "tally-error", ready: [".mj-goals", ".mj-tally-note--problem"] },
  { name: "tally-not-configured", ready: [".mj-goals", ".mj-tally-note"] },
  { name: "tally-4-tags", ready: job(".mj-tally-grid--many") },
  { name: "tally-refreshing", ready: job(".mj-tally-grid--stale"), act: click(".mj-tally-unread button") },
  { name: "tally-daily-null", ready: ["#mj-activity-report .mj-days-section .mj-empty"], act: openDetails },
  { name: "tally-quiet-week", ready: job(".mj-tally-sentence") },
  { name: "popup-out", page: "popup", ready: [".mj-popup form.mj-signin"] },
  { name: "popup-in", page: "popup", ready: [".mj-popup .mj-defs"] },
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
