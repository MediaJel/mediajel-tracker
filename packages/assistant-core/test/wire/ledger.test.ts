import { describe, expect, test } from "bun:test";

import { append, emptyLedger, settle } from "@mediajel/assistant-core/wire/ledger";
import { Outcome, PendingEvent, TabLedger, WireEvent } from "@mediajel/assistant-core/wire/types";
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

/** The row as the kind of event the test appended, so its own fields can be read. */
const asKind = <S extends WireEvent["source"]>(event: WireEvent, source: S): Extract<WireEvent, { source: S }> => {
  if (event.source !== source) throw new Error(`Expected a ${source} row, got ${event.source}.`);
  return event as Extract<WireEvent, { source: S }>;
};

/** Where and when a row was heard — the part every kind of row shares. */
const placed = { id: "row", at: NOW, request: "r-row", pageKey: "doc-1", pageUrl: "https://unity-rd.com/", appId: "" };
const PENDING: Outcome = { kind: "pending" };

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
    const kept = asKind(append(emptyLedger(SITE), [wide], NOW).ledger.events[0], "collector");
    expect(kept.payload).toHaveLength(6_001);
    expect(kept.payload!.endsWith("…")).toBe(true);
    expect(kept.pageUrl).toHaveLength(1_025);
    expect(kept.groups[0].fields[0].value).toHaveLength(513);
    expect(kept.entities[0]).toMatchObject({ data: "d".repeat(2_000), truncated: true });

    const [small] = append(emptyLedger(SITE), [pendingEvent({ payload: "small" })], NOW).ledger.events;
    expect(small).toMatchObject({ payload: "small", pageUrl: "https://unity-rd.com/" });
  });

  test("cuts a partner signal's, a custom-tag fetch's and a third-party fire's URL to the cap", () => {
    const long = `https://r.turn.com/r/beacon?b2=${"x".repeat(2_000)}`;
    const rows: PendingEvent[] = [
      {
        ...placed,
        id: "partner",
        outcome: PENDING,
        source: "partner",
        partner: "nexxen",
        purpose: "audience",
        segment: "x",
        unconfigured: false,
        companion: false,
        url: long,
      },
      {
        ...placed,
        id: "custom",
        outcome: PENDING,
        source: "custom-tag",
        scope: "domain",
        name: "unity-rd.com",
        url: long,
      },
      {
        ...placed,
        id: "fire",
        outcome: PENDING,
        source: "third-party",
        phase: "fired",
        trigger: "onTransaction",
        element: "image",
        host: "r.turn.com",
        url: long,
      },
    ];
    const kept = append(emptyLedger(SITE), rows, NOW).ledger.events;
    expect(asKind(kept[0], "partner").url).toHaveLength(1_025);
    expect(asKind(kept[1], "custom-tag").url).toHaveLength(1_025);
    const fire = asKind(kept[2], "third-party");
    expect(fire.phase === "fired" && fire.url).toHaveLength(1_025);
    expect(kept.map((row) => row.seq)).toEqual([1, 2, 3]);
  });

  test("keeps at most thirty-two hosts per trigger of a registration, and a foreign row as it is", () => {
    const hosts = Array.from({ length: 40 }, (_, i) => `pixel-${i}.example`);
    const rows: PendingEvent[] = [
      {
        ...placed,
        id: "registered",
        outcome: OK,
        source: "third-party",
        phase: "registered",
        triggers: [{ trigger: "onSignup", count: 40, hosts }],
      },
      {
        ...placed,
        id: "foreign",
        outcome: PENDING,
        source: "foreign",
        collector: "col.surfside.io",
        kind: "self-describing",
        code: "ue",
        tracker: "surf",
        version: "js-3.1.0",
      },
    ];
    const kept = append(emptyLedger(SITE), rows, NOW).ledger.events;
    const registered = asKind(kept[0], "third-party");
    expect(registered.phase === "registered" && registered.triggers[0].hosts).toHaveLength(32);
    expect(kept[1]).toEqual({ ...rows[1], seq: 2 });
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
