// Launches Parcel under Node regardless of the node_modules layout.
//
// Two reasons this wrapper exists instead of calling `parcel` directly:
//  1. Parcel must run on Node — its plugin loader uses a Node internal
//     (packageManager.resolve) that Bun's runtime doesn't implement.
//  2. The `parcel` bin location differs between Bun's hoisted/isolated linkers,
//     so we resolve it through Node's module resolution rather than a fixed path.
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";

import { checkBuildEnv } from "./build-env.mjs";

const require = createRequire(import.meta.url);
const parcelBin = require.resolve("parcel/lib/bin.js");

const args = process.argv.slice(2);

// Only a real build is gated. `watch` and `serve` are someone working locally, where a missing
// collector costs them nothing and a hard stop would just be in the way; a build is the artifact
// that gets synced to a CDN and loaded by every client site, so it has to be told where to post.
if (args[0] === "build") {
  const { errors, warnings } = checkBuildEnv(process.env);
  for (const warning of warnings) console.warn(`\n  warning: ${warning}\n`);
  if (errors.length > 0) {
    console.error("\nThis build was not given what the tag needs:\n");
    for (const error of errors) console.error(`  ${error}\n`);
    process.exit(1);
  }
}

const result = spawnSync(process.execPath, [parcelBin, ...args], {
  stdio: "inherit",
});

process.exit(result.status ?? 1);
