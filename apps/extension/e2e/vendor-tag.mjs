import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Fetches the production tag build into `e2e/fixtures/vendor`, once.
 *
 * The bundle at the bucket root (`index.js`) loads its adapters and its tracker as hashed chunks
 * named relative to itself, so serving a copy from 127.0.0.1:3001 means copying every chunk it
 * names. The one edit made to the copy is the collector host: the harness cannot bind port 443,
 * so the vendored bundle points at the same host on 4443, where the stub collector listens, and
 * Chrome resolves that host to this machine. The URL stays a `*.cnna.io` one, which is what the
 * extension's `chrome.webRequest` filter hears.
 */

const ORIGIN = "https://tags.cnna.io";
const COLLECTOR_HOST = "collector-azsx401.dmp.cnna.io";
const COLLECTOR_PORT = 4443;

const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(here, "fixtures/vendor");

const fetchText = async (name) => {
  const response = await fetch(`${ORIGIN}/${name}`);
  if (!response.ok) throw new Error(`${ORIGIN}/${name} answered ${response.status}`);
  return response.text();
};

/** The hashed chunks a bundle names: `adapters.dcfc097e.js`, `tracker.6dfd3f76.js`, … */
const chunksNamedIn = (source) => [
  ...new Set([...source.matchAll(/"([a-z0-9-]+\.[0-9a-f]{8}\.js)"/g)].map((m) => m[1])),
];

const pointAtStub = (source) => source.replaceAll(COLLECTOR_HOST, `${COLLECTOR_HOST}:${COLLECTOR_PORT}`);

const vendor = async () => {
  mkdirSync(out, { recursive: true });
  const index = await fetchText("index.js");
  writeFileSync(join(out, "index.js"), pointAtStub(index));

  const queue = chunksNamedIn(index);
  const done = new Set(["index.js"]);
  while (queue.length > 0) {
    const name = queue.shift();
    if (done.has(name)) continue;
    done.add(name);
    const chunk = await fetchText(name);
    writeFileSync(join(out, name), pointAtStub(chunk));
    queue.push(...chunksNamedIn(chunk));
  }
  writeFileSync(join(out, "VENDORED.txt"), `${ORIGIN} fetched ${new Date().toISOString()}: ${done.size} files\n`);
  console.log(`Vendored ${done.size} files from ${ORIGIN} into ${out}`);
};

/** Only the first run downloads; delete `e2e/fixtures/vendor` to refresh the copy. */
export const ensureVendoredTag = async () => {
  if (existsSync(join(out, "index.js"))) return out;
  await vendor();
  return out;
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await ensureVendoredTag();
}
