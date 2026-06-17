// Launches Parcel under Node regardless of the node_modules layout (see apps/tracker for the
// full rationale): Parcel's plugin loader needs a Node internal Bun doesn't implement, and the
// bin location varies by linker, so we resolve it through Node's module resolution.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const parcelBin = require.resolve("parcel/lib/bin.js");

const result = spawnSync(process.execPath, [parcelBin, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
