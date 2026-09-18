import { BrowserContext, Worker, chromium } from "@playwright/test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import type { TabTags, TagState } from "@mediajel/assistant-core/tags";
import type { TabLedger } from "@mediajel/assistant-core/wire/types";

import type { JobView, Request, ResultOf } from "../src/bridge/api";

/**
 * A Chromium with the production build loaded as an unpacked extension, and the few ways a spec
 * talks to it: ask the background what the panel would ask, read its session storage, find a tab.
 *
 * This is `test/setup.ts`'s idea turned inside out. The unit tests stand a fake `chrome` in front
 * of the code; here the code runs against the real one, and the spec stands outside it, reading
 * what the extension wrote about the page it was shown.
 */

/** The unpacked build a spec loads. `bun run build` in apps/extension produces it. */
export const DIST = path.resolve(__dirname, "../dist/chrome-mv3-prod");

/**
 * The partners the tag fires pixels at from its segment parameters — the hosts the extension
 * listens on (`PARTNER_HOSTS` in assistant-core's `wire/partners.ts`). They resolve to this
 * machine as well, so a fixture's segment parameters never reach a partner: each pixel lands on a
 * closed port, and the ledger records it `blocked`.
 */
export const PARTNER_HOSTS = [
  "r.turn.com",
  "action.dstillery.com",
  "action.media6degrees.com",
  "tracking.lqm.io",
  "bat.bing.com",
];

/**
 * Every MediaJel collector, and every partner host, resolves to this machine while the harness
 * runs, so no test page view reaches production or a partner and the beacon's URL stays a
 * `*.cnna.io` one for `chrome.webRequest`. The fixtures' stub collector listens where the
 * vendored bundle points; a production tag's beacon lands on a closed port, which the extension
 * hears all the same.
 */
export const HOST_RULES = ["*.dmp.cnna.io", ...PARTNER_HOSTS].map((host) => `MAP ${host} 127.0.0.1`).join(", ");

export interface Launched {
  context: BrowserContext;
  worker: Worker;
  extensionId: string;
  /** Closes the browser and removes its profile. */
  close(): Promise<void>;
}

export const launchWithExtension = async (extraArgs: string[] = []): Promise<Launched> => {
  if (!fs.existsSync(path.join(DIST, "manifest.json"))) {
    throw new Error(`No production build at ${DIST}. Run \`bun run build\` in apps/extension first.`);
  }
  const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), "mj-e2e-"));
  const context = await chromium.launchPersistentContext(userDataDir, {
    channel: "chromium",
    headless: true,
    args: [
      `--disable-extensions-except=${DIST}`,
      `--load-extension=${DIST}`,
      `--host-resolver-rules=${HOST_RULES}`,
      ...extraArgs,
    ],
  });
  const worker = context.serviceWorkers()[0] ?? (await context.waitForEvent("serviceworker"));
  // The worker exists before its script has finished evaluating, and a page opened in that gap can
  // make its first requests before the worker's `webRequest` listeners are registered — a race no
  // real browser has (a stopped worker is woken by the request, after its listeners are in place).
  // An evaluation runs only once the worker's own script has run to completion.
  await worker.evaluate(() => undefined);
  return {
    context,
    worker,
    extensionId: new URL(worker.url()).host,
    close: async () => {
      await context.close();
      fs.rmSync(userDataDir, { recursive: true, force: true });
    },
  };
};

/** The background's service worker as it is now — a restart or a reload replaces the old handle. */
export const currentWorker = async (context: BrowserContext, timeoutMs = 10_000): Promise<Worker> =>
  context.serviceWorkers().at(-1) ?? context.waitForEvent("serviceworker", { timeout: timeoutMs });

/** What the background answers, exactly as `bridge/api.ts` receives it. */
export type Answer<T> = { ok: true; value: T } | { ok: false; error: string; code?: string };

/**
 * Asks the background the way the panel does: from an extension page, over `chrome.runtime.sendMessage`.
 * The popup is the smallest page the build has; what it renders while the message is in flight is
 * beside the point.
 */
export const askBackground = async <K extends Request["type"]>(
  context: BrowserContext,
  extensionId: string,
  request: Extract<Request, { type: K }>,
): Promise<Answer<ResultOf[K]>> => {
  const page = await context.newPage();
  try {
    await page.goto(`chrome-extension://${extensionId}/popup.html`);
    return await page.evaluate((message) => chrome.runtime.sendMessage(message), request);
  } finally {
    await page.close();
  }
};

/** The value of an answer, or a failure that says what the background said. */
export const valueOf = <T>(answer: Answer<T>): T => {
  if (!answer.ok) throw new Error(`The background answered with an error: ${answer.error}`);
  return answer.value;
};

/** Everything in `chrome.storage.session` — where the background keeps what it knows about each tab. */
export const sessionStorage = (worker: Worker): Promise<Record<string, unknown>> =>
  worker.evaluate(() => chrome.storage.session.get(null));

/** The id of the first tab whose URL starts with `urlPrefix`, or null. */
export const tabIdFor = (worker: Worker, urlPrefix: string): Promise<number | null> =>
  worker.evaluate(async (prefix) => {
    const tabs = await chrome.tabs.query({});
    return tabs.find((tab) => (tab.url ?? "").startsWith(prefix))?.id ?? null;
  }, urlPrefix);

/** A stored value as an object: the background writes through Plasmo's Storage, which keeps JSON text. */
const stored = (value: unknown): unknown => {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

const isTabRecord = (value: unknown): value is TabTags =>
  !!value && typeof value === "object" && Array.isArray((value as TabTags).tags);

/** The background's record of one tab — `tags/<tabId>` in its session storage — or null when it has none. */
export const readTabRecord = (all: Record<string, unknown>, tabId: number): TabTags | null => {
  const record = stored(all[`tags/${tabId}`]);
  return isTabRecord(record) ? record : null;
};

const isTabLedger = (value: unknown): value is TabLedger =>
  !!value && typeof value === "object" && Array.isArray((value as TabLedger).events);

/** The background's ledger of one tab — `events/<tabId>` in its session storage, oldest first — or null when it has none. */
export const readTabLedger = (all: Record<string, unknown>, tabId: number): TabLedger | null => {
  const ledger = stored(all[`events/${tabId}`]);
  return isTabLedger(ledger) ? ledger : null;
};

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Reads until `until` accepts what was read or the time is up, and hands back the last read
 * either way — the assertion belongs to the spec.
 */
const poll = async <T>(read: () => Promise<T>, until: (value: T) => boolean, timeoutMs: number): Promise<T> => {
  const deadline = Date.now() + timeoutMs;
  let value = await read();
  while (!until(value) && Date.now() < deadline) {
    await sleep(500);
    value = await read();
  }
  return value;
};

/** The tab's record, read until `until` accepts it or the time is up. */
export const pollTabRecord = (
  worker: Worker,
  tabId: number,
  until: (record: TabTags | null) => boolean,
  timeoutMs: number,
): Promise<TabTags | null> => poll(async () => readTabRecord(await sessionStorage(worker), tabId), until, timeoutMs);

/** The tab's ledger, read until `until` accepts it or the time is up. */
export const pollTabLedger = (
  worker: Worker,
  tabId: number,
  until: (ledger: TabLedger | null) => boolean,
  timeoutMs: number,
): Promise<TabLedger | null> => poll(async () => readTabLedger(await sessionStorage(worker), tabId), until, timeoutMs);

/** The state of one app ID in a record, or null when the record does not name it. */
export const stateOf = (record: TabTags | null, appId: string): TagState | null =>
  record?.tags.find((tag) => tag.appId === appId)?.state ?? null;

/** Every app ID a `job/open` answer names, in the order the page's tags were first seen. */
export const appIdsInView = (view: JobView | null): string[] => view?.tags.map((tag) => tag.appId) ?? [];

/**
 * `KEY=value` lines from a local env file, or null when there is none. The panel spec reads the
 * operator's e2e credentials this way; nothing here prints or stores a value.
 */
export const readEnvFile = (file: string): Record<string, string> | null => {
  if (!fs.existsSync(file)) return null;
  const entries = fs
    .readFileSync(file, "utf8")
    .split(/\r?\n/)
    .map((line) => line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/))
    .filter((match): match is RegExpMatchArray => match !== null)
    .map((match) => [match[1], match[2].replace(/^(['"])(.*)\1$/, "$2")]);
  return Object.fromEntries(entries);
};
