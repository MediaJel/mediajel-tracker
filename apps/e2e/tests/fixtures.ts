import { test as base, expect } from "@playwright/test";

import { Micro } from "../rig/micro";
import { MICRO_URL } from "../playwright.config";

/**
 * Every spec gets a Micro that has just been reset, and a check that Micro is actually answering.
 *
 * The check earns its lines: with the container stopped, every assertion in the suite times out
 * waiting for events that were never going to arrive, and the failure reads as "the tag is broken"
 * rather than "start the pipeline".
 *
 * Micro is reached through `baseURL` — the rig proxies its REST API onto the same origin the tag
 * posts to — so the suite has one source of truth for where the rig is, the config.
 */
export const test = base.extend<{ micro: Micro }>({
  micro: async ({ baseURL }, use) => {
    const micro = new Micro(baseURL ?? "");
    try {
      await micro.counts();
    } catch {
      throw new Error(
        `Snowplow Micro is not answering through the rig at ${baseURL} (upstream ${MICRO_URL}).\n` +
          `Start it from the repo root:  bun run micro:up`,
      );
    }
    await micro.reset();
    await use(micro);
  },
});

export { expect };

/** The tag's URL on a fixture page: the query string IS the tag's configuration. */
export const fixtureUrl = (params: Record<string, string>): string => `/?${new URLSearchParams(params).toString()}`;
