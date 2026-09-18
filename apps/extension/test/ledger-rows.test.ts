import { describe, expect, test } from "bun:test";

import { CollectorEvent } from "@mediajel/assistant-core/wire/types";

import { matches, padCount, pageLabel, rowOf, schemaShort, typeOf } from "~/ui/ledger";

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
