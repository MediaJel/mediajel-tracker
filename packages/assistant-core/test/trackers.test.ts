import { describe, expect, test } from "bun:test";

import { askRunningTags, snowplowCommand } from "@mediajel/assistant-core/trackers";

/**
 * Asking the page's Snowplow for its trackers, the way both SDK builds answer: a function command
 * runs with `this` set to the trackers keyed by namespace — later, from the queue, or at once.
 */

/** The loader's stub before the SDK arrives: every command waits in `q`. */
const loaderStub = (): ((...args: unknown[]) => void) & { q: unknown[][] } => {
  const stub = ((...args: unknown[]) => {
    stub.q.push(args);
  }) as ((...args: unknown[]) => void) & { q: unknown[][] };
  stub.q = [];
  return stub;
};

/** The SDK's dispatcher after loading: a function command runs now, with the trackers as `this`. */
const loadedSdk = (trackers: Record<string, unknown>) => {
  const sdk = ((...args: unknown[]) => {
    const [command] = args;
    if (typeof command === "function") command.apply(trackers, []);
  }) as ((...args: unknown[]) => void) & { q: { push: () => void } };
  sdk.q = { push: () => undefined };
  return sdk;
};

describe("askRunningTags", () => {
  test("before the SDK loads, the question waits in the queue and is answered when the SDK runs it", () => {
    const win = { tracker: loaderStub() } as unknown as Window;
    const answers: string[][] = [];

    expect(askRunningTags(win, (appIds) => answers.push(appIds))).toBe(true);
    expect(answers).toEqual([]);

    // The SDK arrives and drains the queue with the trackers it created as `this`.
    const trackers = { "7bc01df0-c859-4392-b90d-a949e95dfe6f": {}, "second-tag": {} };
    for (const [command] of (win as unknown as { tracker: { q: unknown[][] } }).tracker.q) {
      (command as (this: unknown) => void).apply(trackers);
    }
    expect(answers).toEqual([["7bc01df0-c859-4392-b90d-a949e95dfe6f", "second-tag"]]);
  });

  test("after the SDK has loaded, it is answered at once", () => {
    const win = { tracker: loadedSdk({ acme: {} }) } as unknown as Window;
    const answers: string[][] = [];
    expect(askRunningTags(win, (appIds) => answers.push(appIds))).toBe(true);
    expect(answers).toEqual([["acme"]]);
  });

  test("a page with no Snowplow loader, or a `tracker` of its own without a queue, is left alone", () => {
    expect(askRunningTags({} as Window, () => undefined)).toBe(false);
    expect(askRunningTags({ tracker: () => undefined } as unknown as Window, () => undefined)).toBe(false);
    expect(snowplowCommand({ tracker: { q: [] } } as unknown as Window)).toBeNull();
  });

  test("a Snowplow that throws is not the extension's problem", () => {
    const throwing = (() => {
      throw new Error("no");
    }) as unknown as ((...args: unknown[]) => void) & { q: unknown[] };
    throwing.q = [];
    expect(askRunningTags({ tracker: throwing } as unknown as Window, () => undefined)).toBe(false);
  });
});
