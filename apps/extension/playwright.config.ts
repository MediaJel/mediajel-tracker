import { defineConfig } from "@playwright/test";

/**
 * The end-to-end harness: a real Chromium with the production build loaded as an unpacked
 * extension, driven by Playwright. Everything it writes lands under `e2e/out` (gitignored)
 * except the reference screenshots, which are the point of committing anything at all.
 *
 * One worker, no retries: every spec launches its own browser profile with the extension in it,
 * and the fixture servers bind fixed ports. A retry would only hide a flake worth reading about.
 */
export default defineConfig({
  testDir: "e2e",
  outputDir: "e2e/out/results",
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: "list",
  timeout: 120_000,
  snapshotPathTemplate: "{testDir}/__screenshots__/{arg}{ext}",
  expect: {
    timeout: 15_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.002 },
  },
  use: {
    viewport: { width: 400, height: 1000 },
    // The panel prints times and numbers in the browser's locale and zone; pinning both keeps the
    // reference screenshots the same on every machine that renders them.
    timezoneId: "UTC",
    locale: "en-US",
  },
});
