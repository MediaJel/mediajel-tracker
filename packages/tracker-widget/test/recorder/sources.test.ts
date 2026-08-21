/* global RequestInfo */
import { afterEach, beforeEach, describe, expect, test } from "bun:test";

import { QueryStringContext } from "@mediajel/tracker-core/types";
import { WidgetContext } from "@mediajel/tracker-widget/context";
import { DraftEvent, SourceHost } from "@mediajel/tracker-widget/recorder/recorder";
import { dataLayerSource } from "@mediajel/tracker-widget/recorder/sources/datalayer";
import { navigationSource } from "@mediajel/tracker-widget/recorder/sources/navigation";
import { storageSource } from "@mediajel/tracker-widget/recorder/sources/storage";
import { fetchSource } from "@mediajel/tracker-widget/recorder/sources/fetch";

import { sleep } from "../helpers";

/**
 * Each source is exercised against the real window with a fake host that just collects what
 * was emitted. Sources must call through (the page behaves identically) and record accurately.
 */

type Emitted = { draft: DraftEvent; opts?: { flush?: boolean; scoreText?: string } };

const makeHost = (tag: Partial<QueryStringContext> = {}): { host: SourceHost; emitted: Emitted[] } => {
  const emitted: Emitted[] = [];
  const widget = {
    tag: { appId: "test-app", collector: "//collector.test", ...tag } as QueryStringContext,
    isOwn: () => false,
  } as unknown as WidgetContext;
  const host: SourceHost = {
    widget,
    emit: (draft, opts) => emitted.push({ draft, opts }),
    newPage: () => "pg-next",
    pageId: () => "pg-1",
  };
  return { host, emitted };
};

describe("dataLayerSource", () => {
  let dispose: (() => void) | null = null;

  afterEach(() => {
    dispose?.();
    dispose = null;
    delete window.dataLayer;
    delete window.gtmDataLayer;
  });

  test("replays what was already there, flagged, then records live pushes", () => {
    window.dataLayer = [{ event: "gtm.js" }];
    const { host, emitted } = makeHost();
    dispose = dataLayerSource(host);

    window.dataLayer.push({ event: "purchase", ecommerce: { value: 84 } });

    expect(emitted).toHaveLength(2);
    const [replayed, live] = emitted.map((e) => e.draft) as [
      Extract<DraftEvent, { kind: "datalayer" }>,
      Extract<DraftEvent, { kind: "datalayer" }>,
    ];
    expect(replayed.replayed).toBe(true);
    expect(live.replayed).toBeUndefined();
    expect(live.summary).toContain("purchase");
    // Live pushes are flushed (a purchase usually precedes a navigation); replays are not.
    expect(emitted[1].opts?.flush).toBe(true);
    // The array still behaves: push returned and the entry landed.
    expect(window.dataLayer).toHaveLength(2);
  });

  test("re-patches a replaced array and replays only what it has not seen", async () => {
    window.dataLayer = [];
    const { host, emitted } = makeHost();
    dispose = dataLayerSource(host);

    // GTM-style: the site replaces the array wholesale.
    window.dataLayer = [{ event: "after-swap" }];
    await sleep(600); // identity poll runs at 500ms

    expect(emitted.some((e) => e.draft.summary.includes("after-swap"))).toBe(true);
    window.dataLayer.push({ event: "post-swap-live" });
    expect(emitted.some((e) => e.draft.summary.includes("post-swap-live"))).toBe(true);
  });

  test("masks PII inside pushed payloads at capture", () => {
    window.dataLayer = [];
    const { host, emitted } = makeHost();
    dispose = dataLayerSource(host);

    window.dataLayer.push({ event: "signup", email: "jane@example.com" });

    const data = (emitted[0].draft as Extract<DraftEvent, { kind: "datalayer" }>).data as Record<string, unknown>;
    expect(data.email).toBe("j***@e***.com");
  });
});

describe("navigationSource", () => {
  test("records pushState call-through-first and starts a new page", () => {
    const { host, emitted } = makeHost();
    const before = history.pushState;
    const dispose = navigationSource(host);

    history.pushState({}, "", "/thank-you?order=T1");

    expect(location.pathname).toBe("/thank-you"); // called through
    const nav = emitted.find((e) => e.draft.kind === "nav")?.draft as Extract<DraftEvent, { kind: "nav" }>;
    expect(nav.sub).toBe("pushState");
    expect(nav.to).toContain("/thank-you");

    dispose();
    expect(history.pushState).toBe(before);
    history.pushState({}, "", "/checkout");
  });
});

describe("storageSource", () => {
  let dispose: (() => void) | null = null;

  beforeEach(() => {
    localStorage.clear();
  });
  afterEach(() => {
    dispose?.();
    dispose = null;
  });

  test("records page writes but skips widget, snowplow and tag-dedup keys", () => {
    const { host, emitted } = makeHost();
    dispose = storageSource(host);

    localStorage.setItem("mdj_order_summary", '{"id":"T1"}');
    localStorage.setItem("mj-widget:session", "x");
    localStorage.setItem("_sp_id.abc", "x");
    localStorage.setItem("test-app_transaction", "x");

    const keys = emitted.map((e) => (e.draft as Extract<DraftEvent, { kind: "storage" }>).key);
    expect(keys).toEqual(["mdj_order_summary"]);
    // Call-through happened for every write, recorded or not.
    expect(localStorage.getItem("_sp_id.abc")).toBe("x");
  });
});

describe("fetchSource", () => {
  test("records the page's fetch without consuming it, and skips the widget's own hosts", async () => {
    const originalFetch = window.fetch;
    const calls: string[] = [];
    window.fetch = (async (input: RequestInfo | URL) => {
      calls.push(String(input));
      return new Response('{"ok":true,"order":"T9"}', { status: 201, headers: { "content-type": "application/json" } });
    }) as typeof fetch;

    const { host, emitted } = makeHost();
    const dispose = fetchSource(host);

    const res = await window.fetch("https://shop.example.com/api/checkout", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: '{"email":"jane@example.com","total":84}',
    });
    await window.fetch("https://api.github.com/user");
    await sleep(10); // response recording is async

    expect(await res.json()).toEqual({ ok: true, order: "T9" }); // the page's copy is untouched
    expect(calls).toHaveLength(2); // called through both times

    const nets = emitted.filter((e) => e.draft.kind === "network") as {
      draft: Extract<DraftEvent, { kind: "network" }>;
    }[];
    expect(nets).toHaveLength(1); // github never recorded
    expect(nets[0].draft.status).toBe(201);
    expect(nets[0].draft.reqBody).toContain("j***@e***.com"); // masked at capture
    expect(nets[0].draft.resBody).toContain("T9");

    dispose();
    window.fetch = originalFetch;
  });
});
