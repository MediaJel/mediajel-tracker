// Launches Parcel under Node regardless of the node_modules layout.
//
// Two reasons this wrapper exists instead of calling `parcel` directly:
//  1. Parcel must run on Node — its plugin loader uses a Node internal
//     (packageManager.resolve) that Bun's runtime doesn't implement.
//  2. The `parcel` bin location differs between Bun's hoisted/isolated linkers,
//     so we resolve it through Node's module resolution rather than a fixed path.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const parcelBin = require.resolve("parcel/lib/bin.js");

const result = spawnSync(process.execPath, [parcelBin, ...process.argv.slice(2)], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
