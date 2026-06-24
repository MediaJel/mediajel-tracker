/**
 * Refresh the local offline-fallback copy of the com.mediajel.* Iglu schemas by fetching
 * them over HTTP from the PUBLIC MediaJel Iglu registry (http://iglu.mediajel.ninja) — the
 * same registry MediaJel's production enrich uses. No repo clone, no credentials.
 *
 * At runtime Snowplow Micro resolves these schemas directly from the public registry
 * (see infra/micro/iglu.json); this script only updates the on-disk fallback used when
 * the registry is unreachable (offline dev). Unknown/404 URIs are skipped.
 *
 *   bun run packages/iglu-schemas/scripts/sync.ts
 *   MJ_IGLU_BASE=http://iglu.mediajel.ninja bun run .../sync.ts
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const DEST = join(here, "..", "schemas");
const BASE = (process.env.MJ_IGLU_BASE ?? "http://iglu.mediajel.ninja").replace(/\/$/, "");

// The com.mediajel.* schema URIs the tracker emits (events + contexts).
const SCHEMAS = [
  "com.mediajel.events/sign_up/jsonschema/1-0-2",
  "com.mediajel.events/ad_impression/jsonschema/1-0-3",
  "com.mediajel.events/enhanced_transaction/jsonschema/1-0-1",
  "com.mediajel.events/record/jsonschema/1-0-2",
  "com.mediajel.contexts/client/jsonschema/1-0-0",
  "com.mediajel.contexts/campaign/jsonschema/1-0-0",
  "com.mediajel.contexts/identities/jsonschema/1-0-0",
];

let ok = 0;
let skipped = 0;
for (const path of SCHEMAS) {
  const url = `${BASE}/schemas/${path}`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) {
      console.warn(`  skip [${res.status}] ${path}`);
      skipped++;
      continue;
    }
    const body = await res.text();
    const dest = join(DEST, path);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, body.endsWith("\n") ? body : body + "\n");
    console.log(`  ✓ ${path}`);
    ok++;
  } catch (err) {
    console.warn(`  skip (unreachable) ${path}: ${(err as Error).message}`);
    skipped++;
  }
}

if (ok === 0) {
  console.warn(
    "\n⚠️  Could not reach the public MediaJel Iglu registry. Keeping existing offline mirrors.",
    "\n   (Micro still resolves schemas live from http://iglu.mediajel.ninja when online.)",
  );
} else {
  console.log(`\n✓ Refreshed ${ok} schema(s) from ${BASE} (${skipped} skipped).`);
}
process.exit(0);
