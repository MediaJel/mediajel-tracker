import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * The preview site the visual matrix renders: the production build copied to `e2e/out/site`,
 * with the chrome stub loaded ahead of the bundle in the two pages that have a `chrome` to stand
 * in for. Served at a root, because the built pages reference their assets by absolute path.
 *
 * `darkreader-lock` keeps the Dark Reader extension, when a browser has it, from repainting the
 * page under a screenshot.
 */

const here = dirname(fileURLToPath(import.meta.url));
const dist = resolve(here, "../dist/chrome-mv3-prod");
const out = resolve(here, "out/site");
const PAGES = ["sidepanel.html", "popup.html"];
const HEAD = '<head><meta name="darkreader-lock"><script src="/chrome-stub.js"></script>';

const withStub = (html) => {
  if (!html.includes("<head>")) throw new Error("The built page has no <head> to put the stub in.");
  return html.replace("<head>", HEAD);
};

export const buildPreview = () => {
  if (!existsSync(join(dist, "manifest.json"))) {
    throw new Error(`No production build at ${dist}. Run \`bun run build\` in apps/extension first.`);
  }
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  cpSync(dist, out, { recursive: true });
  for (const page of PAGES) writeFileSync(join(out, page), withStub(readFileSync(join(out, page), "utf8")));
  copyFileSync(join(here, "stub/chrome-stub.js"), join(out, "chrome-stub.js"));
  console.log(`Preview site written to ${out}`);
  return out;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildPreview();
