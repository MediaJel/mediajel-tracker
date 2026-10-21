/**
 * Runs the rig until killed. Playwright's `webServer` starts this and waits for the port; running it
 * by hand is also how you poke at a fixture in a real browser (`bun run rig/serve.ts`, then open
 * http://localhost:4330/?appId=whatever).
 */
import { startRig } from "./server";

const PORT = Number(process.env.RIG_PORT ?? 4330);
const MICRO = process.env.MICRO_URL ?? "http://localhost:9090";

const rig = startRig(PORT, MICRO);

console.log(`rig on ${rig.url}, micro at ${MICRO}`);
