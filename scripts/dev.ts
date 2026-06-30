#!/usr/bin/env bun
/**
 * `bun dev` for the Integrations training stack. One command brings up everything:
 *   1. Sync the com.mediajel.* Iglu schemas (best-effort; keeps vendored mirrors if no repo access)
 *   2. Start Snowplow Micro via Docker Compose
 *   3. Wait until Micro is healthy on :9090
 *   4. Build the tag (apps/tracker) so the training site can serve it at /tag
 *   5. Launch the training site (Parcel watch + Bun dev server with the Micro proxy)
 *
 * Micro is left running on exit (fast restarts); stop it with `bun run micro:down`.
 */
const MICRO_HEALTH = process.env.MICRO_URL
  ? `${process.env.MICRO_URL}/micro/all`
  : "http://localhost:9090/micro/all";

const step = (msg: string) => console.log(`\x1b[36m▸ ${msg}\x1b[0m`);
const ok = (msg: string) => console.log(`\x1b[32m✓ ${msg}\x1b[0m`);
const fail = (msg: string) => console.error(`\x1b[31m✗ ${msg}\x1b[0m`);

const sync = (cmd: string[]) =>
  Bun.spawnSync(cmd, { stdout: "inherit", stderr: "inherit" });

// 1. Schemas — best effort (sync.ts exits 0 even without access to mj-snowplow-management)
step("Syncing Iglu schemas (best-effort)…");
sync(["bun", "run", "schemas:sync"]);

// 2. Docker — Snowplow Micro
step("Starting Snowplow Micro (docker compose)…");
const up = sync(["docker", "compose", "up", "-d", "snowplow-micro"]);
if (up.exitCode !== 0) {
  fail("docker compose up failed — is Docker running? (start Docker Desktop and retry)");
  process.exit(1);
}

// 3. Wait for Micro health
step("Waiting for Micro on :9090 …");
let ready = false;
for (let i = 0; i < 60; i++) {
  try {
    const r = await fetch(MICRO_HEALTH);
    if (r.ok) {
      ready = true;
      break;
    }
  } catch {
    /* not up yet */
  }
  await Bun.sleep(2000);
}
if (!ready) {
  fail("Micro did not become healthy. Check `bun run micro:logs`.");
  process.exit(1);
}
ok("Micro ready");

// 4. Build the tag so /tag/* is served by the site's dev server
step("Building the tag (apps/tracker) for /tag …");
const tag = sync(["bun", "x", "turbo", "run", "build", "--filter=mediajel-tracker"]);
if (tag.exitCode !== 0) {
  fail("tag build failed");
  process.exit(1);
}

// 5. Launch the training site (persistent)
step("Launching the training site …");
const dev = Bun.spawn(["bun", "x", "turbo", "run", "dev", "--filter=@mediajel/integrations"], {
  stdout: "inherit",
  stderr: "inherit",
  stdin: "inherit",
});

const shutdown = () => {
  dev.kill();
  console.log("\n\x1b[33m(Micro left running — `bun run micro:down` to stop it.)\x1b[0m");
  process.exit(0);
};
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
await dev.exited;
