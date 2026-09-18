import { describe, expect, test } from "bun:test";

import type { TagRecord } from "@mediajel/assistant-core/tags";
import { CollectorEvent, LedgerView, PartnerSignal } from "@mediajel/assistant-core/wire/types";
import { applyDelta, attributed, byPage, mergeRead } from "@mediajel/assistant-core/wire/view";

/**
 * What the panel does with a ledger: pushes on top of a read, reads over pushes, and the rows
 * under the pages that made them. A push seen twice must not draw a row twice, and a push that
 * beat the read that carries it must not be lost when the read lands.
 */

const event = (seq: number, pageKey: string, code = "pv"): CollectorEvent => ({
  id: `r${seq}:0`,
  seq,
  at: 1_000 + seq,
  request: `r${seq}`,
  pageKey,
  pageUrl: `https://shop.example.com/${pageKey}`,
  appId: "app",
  outcome: { kind: "pending" },
  source: "collector",
  transport: "post",
  collector: "collector.example",
  kind: code === "pv" ? "page-view" : "page-ping",
  code,
  name: code === "pv" ? "Page view" : "Page ping",
  groups: [],
  entities: [],
  batch: { index: 0, size: 1 },
});

const view = (events: CollectorEvent[], seq = Math.max(0, ...events.map((e) => e.seq))): LedgerView => ({
  site: "shop.example.com",
  events,
  pages: [{ key: "a", url: "https://shop.example.com/a", at: 1 }],
  dropped: 0,
  seq,
});

describe("a push over what the panel holds", () => {
  test("new rows go on top, a row already held is not drawn twice, and a settle lands by id", () => {
    const held = view([event(2, "a"), event(1, "a")]);
    const next = applyDelta(held, {
      appended: [event(2, "a"), event(3, "b")],
      settled: [{ id: "r1:0", outcome: { kind: "ok", status: 200, fromCache: false } }],
      pages: [{ key: "b", url: "https://shop.example.com/b", at: 3 }],
      dropped: 4,
    });
    expect(next.events.map((e) => e.seq)).toEqual([3, 2, 1]);
    expect(next.events[2].outcome).toEqual({ kind: "ok", status: 200, fromCache: false });
    expect(next.pages.map((p) => p.key)).toEqual(["a", "b"]);
    expect(next.dropped).toBe(4);
    expect(next.seq).toBe(3);
  });
});

describe("a read over what the panel holds", () => {
  test("keeps a push that beat the read, newest first", () => {
    const pushed = view([event(4, "b")]);
    const read = view([event(3, "a"), event(2, "a")]);
    const merged = mergeRead(pushed, read);
    expect(merged.events.map((e) => e.seq)).toEqual([4, 3, 2]);
    expect(merged.seq).toBe(4);
  });
});

describe("rows under their pages", () => {
  test("newest page first, rows newest first, and a page the ledger never named takes its rows' URL", () => {
    const held = view([event(5, "b", "pp"), event(4, "b"), event(3, "a"), event(2, "a"), event(1, "a")]);
    const groups = byPage(held);
    expect(groups.map((group) => group.page.key)).toEqual(["b", "a"]);
    expect(groups[0].page.url).toBe("https://shop.example.com/b");
    expect(groups[0].events.map((e) => e.seq)).toEqual([5, 4]);
    expect(groups[1].events.map((e) => e.seq)).toEqual([3, 2, 1]);
  });
});

describe("partner signals with their tags", () => {
  test("a signal the wire could not attribute takes the tag whose segment it carries; the rest are untouched", () => {
    const tag: TagRecord = {
      appId: "app",
      state: "sending",
      environment: "",
      version: "",
      event: "",
      announced: false,
      firstSeenAt: 0,
      collector: "",
      enabled: true,
      config: { params: { "s3.pv": "SEG" }, src: "", element: "", source: "record" },
    };
    const pixel: PartnerSignal = {
      ...event(9, "a"),
      appId: "",
      source: "partner",
      partner: "dstillery",
      purpose: "audience",
      segment: "SEG",
      unconfigured: false,
      companion: false,
      url: "",
    };
    const [first, second] = attributed([pixel, event(1, "a")], [tag]);
    expect(first.appId).toBe("app");
    expect(second).toBe(second);
  });
});
