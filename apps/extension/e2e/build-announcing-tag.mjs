import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Builds this repo's tag — the one that announces itself — into `e2e/fixtures/announcing`, once.
 *
 * `apps/tracker` is built with its collector pointed at the stub collector's host and port (the
 * tag reads `COLLECTOR_URL` at build time), so the fixture's page view lands on the stub the same
 * way the vendored production bundle's does, and Chrome's host rule keeps the URL a `*.cnna.io`
 * one for `chrome.webRequest`. Only the scripts are copied: the source maps are not served.
 */

const here = dirname(fileURLToPath(import.meta.url));
const tracker = resolve(here, "../../tracker");
const out = resolve(here, "fixtures/announcing");

const COLLECTOR = "//collector-azsx401.dmp.cnna.io:4443";

const build = () => {
  execFileSync("bun", ["run", "build"], {
    cwd: tracker,
    stdio: "inherit",
    env: { ...process.env, COLLECTOR_URL: COLLECTOR, PARCEL_WORKERS: "1" },
  });
  mkdirSync(out, { recursive: true });
  const scripts = readdirSync(join(tracker, "dist")).filter((name) => name.endsWith(".js"));
  for (const name of scripts) copyFileSync(join(tracker, "dist", name), join(out, name));
  writeFileSync(join(out, "BUILT.txt"), `apps/tracker built ${new Date().toISOString()}: ${scripts.length} files\n`);
  console.log(`Built the announcing tag into ${out} (${scripts.length} files)`);
};

/** Only the first run builds; delete `e2e/fixtures/announcing` to rebuild after a tag change. */
export const ensureAnnouncingTag = () => {
  if (!existsSync(join(out, "index.js"))) build();
  return out;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  ensureAnnouncingTag();
}
