import { describe, expect, test } from "bun:test";

import { CollectorEvent, WireEvent } from "@mediajel/assistant-core/wire/types";

import { matches, padCount, pageLabel, rowDomId, rowOf, schemaShort, stepTo, typeOf } from "~/ui/ledger";

/**
 * The words the ledger uses for a row. A transaction has to read as its order and total, a
 * self-describing event as its schema, and a request the browser refused as the word "blocked" —
 * never a colour alone.
 */

const event = (overrides: Partial<CollectorEvent> = {}): CollectorEvent => ({
  id: "r1:0",
  seq: 1,
  at: Date.parse("2026-09-16T15:00:12Z"),
  request: "r1",
  pageKey: "doc-1",
  pageUrl: "https://shop.example.com/checkout",
  appId: "5f976cbb-7d29-46ce-bf07-0f701478d800",
  outcome: { kind: "ok", status: 200, fromCache: false },
  source: "collector",
  transport: "post",
  collector: "collector-azsx401.dmp.cnna.io",
  kind: "page-view",
  code: "pv",
  name: "Page view",
  groups: [],
  entities: [],
  batch: { index: 0, size: 1 },
  ...overrides,
});

const fields = (group: "transaction" | "item", pairs: [string, string][]) => ({
  group,
  label: group,
  fields: pairs.map(([key, value]) => ({ key, label: key, value })),
});

describe("a row's words", () => {
  test("a page view is named, attributed to its tag, and says nothing more", () => {
    const row = rowOf(event());
    expect([row.family, row.name, row.who, row.facts, row.status, row.problem]).toEqual([
      "collector",
      "Page view",
      "5f976cbb",
      "",
      "",
      false,
    ]);
  });

  test("a transaction reads as its order and total; an item as its sku and name", () => {
    const transaction = rowOf(
      event({
        code: "tr",
        name: "Transaction",
        groups: [
          fields("transaction", [
            ["tr_id", "T4821"],
            ["tr_tt", "84"],
          ]),
        ],
      }),
    );
    expect(transaction.facts).toBe("T4821 · 84");
    const item = rowOf(
      event({
        code: "ti",
        name: "Item",
        groups: [
          fields("item", [
            ["ti_sk", "BD-35"],
            ["ti_nm", "Blue Dream 3.5g"],
          ]),
        ],
      }),
    );
    expect(item.facts).toBe("BD-35 · Blue Dream 3.5g");
  });

  test("a self-describing event carries its schema's name and version; a tag the wire never named is said so", () => {
    const row = rowOf(event({ name: "record", schema: "iglu:com.mediajel.events/record/jsonschema/1-0-2", appId: "" }));
    expect(row.facts).toBe("record/1-0-2");
    expect(row.who).toBe("tag unknown");
    expect(schemaShort("iglu:com.snowplowanalytics.snowplow/web_page/jsonschema/1-0-0")).toBe("web_page/1-0-0");
    expect(schemaShort("not-an-iglu-uri")).toBe("not-an-iglu-uri");
  });

  test("the status is a word only when a request is in flight or went wrong", () => {
    const status = (outcome: CollectorEvent["outcome"]) => rowOf(event({ outcome })).status;
    expect(status({ kind: "pending" })).toBe("sending…");
    expect(status({ kind: "ok", status: 200, fromCache: false })).toBe("");
    expect(status({ kind: "failed", status: 503 })).toBe("failed (503)");
    expect(status({ kind: "blocked", error: "net::ERR_BLOCKED_BY_CLIENT" })).toBe("blocked");
    expect(rowOf(event({ outcome: { kind: "blocked", error: "net::ERR_BLOCKED_BY_CLIENT" } })).problem).toBe(true);
  });
});

describe("the list's helpers", () => {
  test("a filter matches the name, the tag or the facts, case aside; an empty filter matches everything", () => {
    const row = rowOf(event({ name: "Transaction", groups: [fields("transaction", [["tr_id", "T4821"]])] }));
    expect(matches(row, "t48")).toBe(true);
    expect(matches(row, "5F97")).toBe(true);
    expect(matches(row, "  ")).toBe(true);
    expect(matches(row, "ping")).toBe(false);
  });

  test("a page band names the host at the root, else the path, with an off-site host under it", () => {
    expect(pageLabel("https://terrabis.co/", "terrabis.co")).toEqual({ path: "terrabis.co/", host: "" });
    expect(pageLabel("https://shop.example.com/checkout?step=2", "shop.example.com")).toEqual({
      path: "/checkout?step=2",
      host: "",
    });
    expect(pageLabel("https://pay.example-checkout.com/return", "shop.example.com")).toEqual({
      path: "/return",
      host: "pay.example-checkout.com",
    });
    expect(pageLabel("", "shop.example.com")).toEqual({ path: "Unknown page", host: "" });
  });

  test("counts are two digits at least, and a value's type is named the way its chip prints it", () => {
    expect([padCount(2), padCount(99), padCount(120)]).toEqual(["02", "99", "120"]);
    expect([typeOf("a"), typeOf(1), typeOf(true), typeOf([]), typeOf({}), typeOf(null)]).toEqual([
      "string",
      "number",
      "boolean",
      "array",
      "object",
      "null",
    ]);
  });
});

describe("the other sources' rows", () => {
  const base = {
    id: "x",
    seq: 9,
    at: 0,
    request: "x",
    pageKey: "doc",
    pageUrl: "",
    appId: "",
    outcome: { kind: "ok", status: 200, fromCache: false },
  } as const;

  test("a partner beacon is named for its partner and purpose, with the tag's default said as such", () => {
    const row = rowOf({
      ...base,
      source: "partner",
      partner: "dstillery",
      purpose: "audience",
      segment: "00000",
      unconfigured: true,
      companion: false,
      url: "",
    } as WireEvent);
    expect([row.family, row.name, row.who, row.facts]).toEqual([
      "partner",
      "Dstillery · page-view beacon",
      "tag unknown",
      "not configured (tag default)",
    ]);
    const sale = rowOf({
      ...base,
      appId: "5f976cbb-7d29",
      source: "partner",
      partner: "nexxen",
      purpose: "conversion",
      segment: "b",
      unconfigured: false,
      companion: false,
      order: { id: "T4821", amount: "84" },
      url: "",
    } as WireEvent);
    expect([sale.name, sale.who, sale.facts]).toEqual(["Nexxen · transaction beacon", "5f976cbb", "T4821 · 84"]);
  });

  test("a custom tag is named for what it loads; a third-party tag for its host and moment; another vendor's tracker for its collector", () => {
    expect(
      rowOf({ ...base, source: "custom-tag", scope: "domain", name: "terrabis.co", url: "" } as WireEvent).name,
    ).toBe("Custom tag · terrabis.co");
    const fired = rowOf({
      ...base,
      source: "third-party",
      phase: "fired",
      trigger: "onTransaction",
      element: "image",
      host: "www.googletagmanager.com",
      url: "",
    } as WireEvent);
    expect([fired.family, fired.name, fired.who, fired.facts]).toEqual([
      "custom",
      "Third-party tag",
      "www.googletagmanager.com",
      "transaction · image",
    ]);
    const registered = rowOf({
      ...base,
      source: "third-party",
      phase: "registered",
      triggers: [{ trigger: "onSignup", count: 1, hosts: ["a.example"] }],
    } as WireEvent);
    expect([registered.name, registered.who, registered.facts]).toEqual([
      "Third-party tags registered",
      "1 tag",
      "sign-up",
    ]);
    const foreign = rowOf({
      ...base,
      source: "foreign",
      collector: "col.surfside.io",
      kind: "self-describing",
      code: "ue",
      tracker: "surf",
      version: "js-3.24.2",
    } as WireEvent);
    expect([foreign.family, foreign.name, foreign.who, foreign.facts]).toEqual([
      "foreign",
      "col.surfside.io · Self-describing event",
      "surf",
      "js-3.24.2",
    ]);
  });
});

describe("walking the ledger by keyboard", () => {
  test("Down and Up step one row, and stop at the ends", () => {
    expect(stepTo("ArrowDown", 0, 3)).toBe(1);
    expect(stepTo("ArrowUp", 2, 3)).toBe(1);
    expect(stepTo("ArrowDown", 2, 3)).toBeNull();
    expect(stepTo("ArrowUp", 0, 3)).toBeNull();
  });

  test("Home and End jump to the ends; from outside the rows, Down lands on the first", () => {
    expect(stepTo("Home", 2, 3)).toBe(0);
    expect(stepTo("End", 0, 3)).toBe(2);
    expect(stepTo("ArrowDown", -1, 3)).toBe(0);
    expect(stepTo("ArrowUp", -1, 3)).toBeNull();
  });

  test("any other key, or no rows at all, is not a step", () => {
    expect(stepTo("Enter", 0, 3)).toBeNull();
    expect(stepTo("ArrowDown", -1, 0)).toBeNull();
  });

  test("a row's DOM id is the event's id with the panel's prefix", () => {
    expect(rowDomId("r1:0")).toBe("mj-event-r1:0");
  });
});
