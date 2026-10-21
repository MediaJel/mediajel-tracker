import { defineConfig } from "@playwright/test";

/**
 * Drives a real Chromium against a real tag build and a real Snowplow pipeline.
 *
 * One worker, no retries, on purpose: every spec asserts against one shared Micro instance and
 * resets it between tests, so two specs in parallel would read each other's events. A retry would
 * paper over exactly the kind of timing bug this suite exists to find.
 *
 * Needs, before it runs: a tag build (`turbo run build --filter=mediajel-tracker`) and Micro
 * (`bun run micro:up` at the repo root). The turbo `e2e` task arranges the first; the suite fails
 * with a plain sentence about the second rather than a wall of timeouts.
 */
export const RIG_PORT = Number(process.env.RIG_PORT ?? 4330);
export const RIG_URL = `http://localhost:${RIG_PORT}`;
export const MICRO_URL = process.env.MICRO_URL ?? "http://localhost:9090";

export default defineConfig({
  testDir: "tests",
  outputDir: "out/results",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: process.env.CI
    ? [
        ["list"],
        ["html", { outputFolder: "out/report", open: "never" }],
        // CircleCI reads JUnit XML to show which test failed on the job page, rather than making
        // someone open the artifacts to find out.
        ["junit", { outputFile: "out/results/junit.xml" }],
      ]
    : "list",
  timeout: 90_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: RIG_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // The tag honours Do Not Track at the SDK level (respectDoNotTrack: true). If the browser ever
    // sent DNT by default, every assertion here would pass on an empty pipeline, so the privacy
    // spec proves both directions rather than trusting this.
    timezoneId: "UTC",
    locale: "en-US",
  },
  webServer: {
    command: "bun run rig/serve.ts",
    url: `${RIG_URL}/stimuli/pageview.json`,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
