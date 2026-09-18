import { describe, expect, test } from "bun:test";

import { append, emptyLedger, settle } from "@mediajel/assistant-core/wire/ledger";
import { Outcome, TabLedger } from "@mediajel/assistant-core/wire/types";
import { viewOf } from "@mediajel/assistant-core/wire/view";

import { pendingEvent } from "./fixtures";

/**
 * The ring buffer every tab's events go into: a sequence that only ever counts up, pages that are
 * upserted by document, outcomes settled by request, and caps that let the oldest go first.
 */

const SITE = "unity-rd.com";
const NOW = 1_758_294_000_000;
const OK: Outcome = { kind: "ok", status: 200, fromCache: false };

const events = (count: number, request = "r"): ReturnType<typeof pendingEvent>[] =>
  Array.from({ length: count }, (_, i) => pendingEvent({ id: `${request}:${i}`, request, at: NOW + i }));

describe("appending", () => {
  test("hands out a monotonic sequence across appends and reports what it appended", () => {
    const first = append(emptyLedger(SITE), events(2, "r1"), NOW);
    const second = append(first.ledger, events(1, "r2"), NOW + 1);
    expect(first.delta.appended.map((event) => event.seq)).toEqual([1, 2]);
    expect(second.delta.appended.map((event) => event.seq)).toEqual([3]);
    expect(second.ledger).toMatchObject({ v: 1, site: SITE, seq: 3, dropped: 0, touchedAt: NOW + 1 });
    expect(second.ledger.events.map((event) => event.id)).toEqual(["r1:0", "r1:1", "r2:0"]);
    expect(second.delta.settled).toEqual([]);
  });

  test("puts each document on record once, and gives it the first URL an event can name", () => {
    const quiet = pendingEvent({ id: "a", pageKey: "doc-1", pageUrl: "" });
    const named = pendingEvent({ id: "b", pageKey: "doc-1", pageUrl: "https://unity-rd.com/menu" });
    const other = pendingEvent({ id: "c", pageKey: "doc-2", pageUrl: "https://unity-rd.com/cart" });
    const { ledger, delta } = append(emptyLedger(SITE), [quiet, named, other], NOW);
    expect(ledger.pages).toEqual([
      { key: "doc-1", url: "https://unity-rd.com/menu", at: quiet.at },
      { key: "doc-2", url: "https://unity-rd.com/cart", at: other.at },
    ]);
    expect(delta.pages).toBe(ledger.pages);

    const later = append(
      ledger,
      [pendingEvent({ id: "d", pageKey: "doc-1", pageUrl: "https://unity-rd.com/other" })],
      NOW,
    );
    expect(later.ledger.pages[0].url).toBe("https://unity-rd.com/menu");
  });

  test("lets the oldest events go past the count cap, counts them, and prunes the pages they were on", () => {
    const first = append(emptyLedger(SITE), [pendingEvent({ id: "old", pageKey: "gone" })], NOW);
    const { ledger, delta } = append(first.ledger, events(300, "r"), NOW);
    expect(ledger.events).toHaveLength(300);
    expect(ledger.events[0].id).toBe("r:0");
    expect(ledger.dropped).toBe(1);
    expect(delta.dropped).toBe(1);
    expect(ledger.pages.map((page) => page.key)).toEqual(["doc-1"]);
  });

  test("lets the oldest events go past the byte cap too", () => {
    const heavy = Array.from({ length: 80 }, (_, i) =>
      pendingEvent({ id: `h:${i}`, request: "h", payload: "x".repeat(5_900), schema: "iglu:x/y/jsonschema/1-0-0" }),
    );
    const { ledger } = append(emptyLedger(SITE), heavy, NOW);
    expect(ledger.events.length).toBeLessThan(80);
    expect(ledger.dropped).toBe(80 - ledger.events.length);
    expect(JSON.stringify(ledger).length).toBeLessThanOrEqual(400_000);
    expect(ledger.events[ledger.events.length - 1].id).toBe("h:79");
  });

  test("cuts an event to the caps: its payload, every field value, every entity's data, its page URL", () => {
    const entity = {
      schema: "iglu:x/y/jsonschema/1-0-0",
      vendor: "x",
      name: "y",
      version: "1-0-0",
      data: "d".repeat(3_000),
      truncated: false,
    };
    const wide = pendingEvent({
      payload: "p".repeat(7_000),
      pageUrl: `https://unity-rd.com/${"u".repeat(2_000)}`,
      groups: [{ group: "page", label: "Page", fields: [{ key: "refr", label: "Referrer", value: "r".repeat(600) }] }],
      entities: [entity],
    });
    const [kept] = append(emptyLedger(SITE), [wide], NOW).ledger.events;
    expect(kept.payload).toHaveLength(6_001);
    expect(kept.payload!.endsWith("…")).toBe(true);
    expect(kept.pageUrl).toHaveLength(1_025);
    expect(kept.groups[0].fields[0].value).toHaveLength(513);
    expect(kept.entities[0]).toMatchObject({ data: "d".repeat(2_000), truncated: true });

    const [small] = append(emptyLedger(SITE), [pendingEvent({ payload: "small" })], NOW).ledger.events;
    expect(small).toMatchObject({ payload: "small", pageUrl: "https://unity-rd.com/" });
  });
});

describe("settling", () => {
  test("settles every pending event of the request, and says which", () => {
    const { ledger } = append(emptyLedger(SITE), [...events(2, "r1"), ...events(1, "r2")], NOW);
    const settled = settle(ledger, "r1", OK, NOW + 5)!;
    expect(settled.delta).toEqual({
      appended: [],
      settled: [
        { id: "r1:0", outcome: OK },
        { id: "r1:1", outcome: OK },
      ],
      pages: ledger.pages,
      dropped: 0,
    });
    expect(settled.ledger.events.map((event) => event.outcome.kind)).toEqual(["ok", "ok", "pending"]);
    expect(settled.ledger.touchedAt).toBe(NOW + 5);
  });

  test("a request the ledger never heard, or one already settled, changes nothing", () => {
    const { ledger } = append(emptyLedger(SITE), events(1, "r1"), NOW);
    expect(settle(ledger, "r9", OK, NOW)).toBeNull();
    const once = settle(ledger, "r1", OK, NOW)!.ledger;
    expect(settle(once, "r1", { kind: "blocked", error: "net::ERR_BLOCKED_BY_CLIENT" }, NOW)).toBeNull();
  });
});

describe("the view", () => {
  test("reads newest first, pages too, and carries the sequence along", () => {
    const one = append(emptyLedger(SITE), [pendingEvent({ id: "a", pageKey: "doc-1" })], NOW).ledger;
    const two = append(one, [pendingEvent({ id: "b", pageKey: "doc-2" })], NOW).ledger;
    const view = viewOf(two);
    expect(view.events.map((event) => event.id)).toEqual(["b", "a"]);
    expect(view.pages.map((page) => page.key)).toEqual(["doc-2", "doc-1"]);
    expect(view).toMatchObject({ site: SITE, dropped: 0, seq: 2 });
    expect(two.events.map((event) => event.id)).toEqual(["a", "b"]);
  });

  test("an empty ledger views as nothing", () => {
    const empty: TabLedger = emptyLedger(SITE);
    expect(viewOf(empty)).toEqual({ site: SITE, events: [], pages: [], dropped: 0, seq: 0 });
  });
});
