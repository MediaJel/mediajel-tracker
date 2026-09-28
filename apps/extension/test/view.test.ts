import { describe, expect, test } from "bun:test";

import { TagRecord } from "@mediajel/assistant-core/tags";
import { WidgetSession } from "@mediajel/assistant-core/types";

import { normalizeView } from "~/sidepanel/view";

/**
 * A panel newer than its service worker must still render: the old worker's `job/open` answer
 * has no `tags`, no `settled`, and a null status for a page it never read.
 */

const session = {
  goal: "transaction",
  step: "home",
  timeline: [],
  pages: [],
  markedIds: [],
} as unknown as WidgetSession;

describe("a job view from an older background", () => {
  test("reads as a page nothing is known about yet — listening, not broken", () => {
    const view = normalizeView({ site: "shop.example.com", session, status: null as never });
    expect(view.tags).toEqual([]);
    expect(view.settled).toBe(false);
    expect(view.status.tagPresent).toBe(false);
    expect(view.status.warnings).toEqual([]);
  });

  test("a current background's answer passes through untouched", () => {
    const status = { tagPresent: true, tags: [], warnings: ["w"] } as never;
    const view = normalizeView({ site: "shop.example.com", session, tags: [], settled: true, status });
    expect(view).toEqual({ site: "shop.example.com", session, tags: [], settled: true, status });
  });

  test("tag rows written before the record learned its collector and configuration are completed", () => {
    const old = {
      appId: "acme",
      state: "sending",
      environment: "weave",
      version: "2",
      event: "",
      announced: false,
      firstSeenAt: 1,
    } as unknown as TagRecord;
    const status = { tagPresent: true, tags: [old], warnings: [] } as never;
    const view = normalizeView({ site: "shop.example.com", session, tags: [old], settled: true, status });
    const completed = { ...old, collector: "", enabled: true, config: null };
    expect(view.tags).toEqual([completed]);
    expect(view.status.tags).toEqual([completed]);
  });
});
