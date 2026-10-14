import { Storage } from "@plasmohq/storage";
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { emptyLedger } from "@mediajel/assistant-core/wire/ledger";
import { PendingEvent } from "@mediajel/assistant-core/wire/types";

import { clearLedger, forgetLedger, readLedger, recordEvents, settleEvents } from "~/background/ledger";
import { clearExtensionStorage } from "./setup";

/**
 * The owner of each tab's ledger, in session storage with an in-memory mirror: what a recycled
 * worker, two requests landing together, and a browser with many tabs must not break.
 */

const SITE = "unity-rd.com";
const OK = { kind: "ok", status: 200, fromCache: false } as const;

const event = (id: string, request = "r1"): PendingEvent => ({
  id,
  at: 1_758_294_000_000,
  request,
  pageKey: "doc-1",
  pageUrl: `https://${SITE}/`,
  appId: "acme",
  outcome: { kind: "pending" },
  source: "collector",
  transport: "post",
  collector: "collector-azsx401.dmp.cnna.io",
  kind: "page-view",
  code: "pv",
  name: "Page view",
  groups: [],
  entities: [],
  batch: { index: 0, size: 1 },
});

/** The same session area the module writes, read the way it reads it. */
const area = new Storage({ area: "session" });

const TABS = Array.from({ length: 14 }, (_, i) => 100 + i);

beforeEach(() => clearExtensionStorage());
afterEach(async () => {
  await Promise.all(TABS.map(forgetLedger));
});

describe("recording a tab's events", () => {
  test("keeps them per tab and per site, in sequence, and reads them back", async () => {
    const delta = await recordEvents(100, SITE, [event("a")]);
    expect(delta?.appended.map((entry) => [entry.id, entry.seq])).toEqual([["a", 1]]);
    expect((await readLedger(100, SITE)).events.map((entry) => entry.id)).toEqual(["a"]);
    expect(await readLedger(100, "other.example")).toEqual(emptyLedger("other.example"));
    expect(await readLedger(101, SITE)).toEqual(emptyLedger(SITE));

    // The tab moved to another site: its ledger described somebody else's page.
    const moved = await recordEvents(100, "other.example", [event("b")]);
    expect(moved?.appended[0].seq).toBe(1);
    expect((await readLedger(100, "other.example")).events.map((entry) => entry.id)).toEqual(["b"]);
    expect(await recordEvents(100, SITE, [])).toBeNull();
  });

  test("appends landing together are written one after the other, none lost", async () => {
    const deltas = await Promise.all([
      recordEvents(102, SITE, [event("a", "r1")]),
      recordEvents(102, SITE, [event("b", "r2")]),
      recordEvents(102, SITE, [event("c", "r3")]),
    ]);
    expect(deltas.map((delta) => delta?.appended[0].seq)).toEqual([1, 2, 3]);
    expect((await readLedger(102, SITE)).events.map((entry) => entry.id)).toEqual(["a", "b", "c"]);
  });

  test("settles a request's events once they are on record, and says which site they belong to", async () => {
    await recordEvents(103, SITE, [event("a", "r1"), event("b", "r1")]);
    expect(await settleEvents(103, "r9", OK)).toBeNull();
    const settled = await settleEvents(103, "r1", OK);
    expect(settled?.site).toBe(SITE);
    expect(settled?.delta.settled.map((entry) => entry.id)).toEqual(["a", "b"]);
    expect((await readLedger(103, SITE)).events.map((entry) => entry.outcome.kind)).toEqual(["ok", "ok"]);
    expect(await settleEvents(104, "r1", OK)).toBeNull();
  });

  test("clearing lets the events go and keeps counting", async () => {
    await recordEvents(105, SITE, [event("a"), event("b")]);
    await clearLedger(105, SITE);
    expect(await readLedger(105, SITE)).toEqual({ ...emptyLedger(SITE), seq: 2 });
    const next = await recordEvents(105, SITE, [event("c")]);
    expect(next?.appended[0].seq).toBe(3);
  });

  test("a closed tab's ledger is forgotten", async () => {
    await recordEvents(106, SITE, [event("a")]);
    await forgetLedger(106);
    expect(await readLedger(106, SITE)).toEqual(emptyLedger(SITE));
    expect(await area.get<number[]>("events/index")).not.toContain(106);
  });

  test("reads a ledger a previous worker wrote — the mirror is cold after a restart", async () => {
    const written = { ...emptyLedger(SITE), events: [{ ...event("a"), seq: 1 }], seq: 1, touchedAt: 1 };
    await area.set("events/107", written);
    expect((await readLedger(107, SITE)).events.map((entry) => entry.id)).toEqual(["a"]);
    const next = await recordEvents(107, SITE, [event("b")]);
    expect(next?.appended[0].seq).toBe(2);
  });

  test("keeps the ledgers of the twelve most recently touched tabs, and lets the oldest go", async () => {
    const [oldest, ...rest] = TABS.slice(0, 13);
    for (const tabId of [oldest, ...rest]) await recordEvents(tabId, SITE, [event(`t${tabId}`)]);
    expect(await area.get<number[]>("events/index")).toEqual([...rest].reverse());
    expect(await readLedger(oldest, SITE)).toEqual(emptyLedger(SITE));
    expect((await readLedger(rest[0], SITE)).events).toHaveLength(1);

    // Touching a tab keeps it; the one touched least recently is the next to go.
    await recordEvents(rest[0], SITE, [event("again")]);
    await recordEvents(TABS[13], SITE, [event("new")]);
    expect(await readLedger(rest[1], SITE)).toEqual(emptyLedger(SITE));
    expect((await readLedger(rest[0], SITE)).events).toHaveLength(2);
  });
});
