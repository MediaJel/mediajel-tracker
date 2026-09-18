import { describe, expect, test } from "bun:test";

import { suggestCandidates } from "@mediajel/assistant-core/ai/suggest";
import { describeEvent, extractFacts, factsLine } from "@mediajel/assistant-core/recorder/describe";

import { makeEvent, makeSession } from "./helpers";

describe("describeEvent", () => {
  test("reads a GA4 purchase push in plain language with its facts pulled out", () => {
    const reading = describeEvent(
      makeEvent({
        kind: "datalayer",
        data: { event: "purchase", ecommerce: { transaction_id: "T4821", value: 84, items: [{}, {}] } },
      }),
    );
    expect(reading.title).toBe("“purchase” event on the data layer");
    expect(factsLine(reading.facts)).toBe("Order T4821 · $84.00 · 2 items");
    expect(reading.background).toBe(false);
  });

  test("reads a checkout POST from its response body", () => {
    const reading = describeEvent(
      makeEvent({
        kind: "network",
        method: "POST",
        url: "https://shop.example.com/api/checkout",
        status: 201,
        resBody: JSON.stringify({ order_number: 991, total: "120.5" }),
      }),
    );
    expect(reading.title).toBe("Sent /api/checkout (201)");
    expect(reading.facts.orderId).toBe("991");
    expect(reading.facts.total).toBe("$120.50");
  });

  test("marks tracker traffic, replays, storage and page loads as background", () => {
    expect(
      describeEvent(makeEvent({ kind: "network", category: "tracker", summary: "tracker sent transaction" }))
        .background,
    ).toBe(true);
    expect(describeEvent(makeEvent({ kind: "datalayer", replayed: true, data: { event: "gtm.js" } })).background).toBe(
      true,
    );
    expect(describeEvent(makeEvent({ kind: "storage", key: "cart" })).background).toBe(true);
    expect(describeEvent(makeEvent({ kind: "click", text: "Place order" })).title).toBe("Clicked “Place order”");
  });

  test("extractFacts never recurses forever and prefers named id keys over bare id", () => {
    const loop: Record<string, unknown> = { id: "x" };
    loop.self = loop;
    expect(extractFacts(loop).orderId).toBe("x");
    expect(extractFacts({ id: "cart-1", order_id: "O-7" }).orderId).toBe("O-7");
  });
});

describe("suggestCandidates", () => {
  test("leads with the purchase push and explains why, one candidate per kind", () => {
    const session = makeSession({
      goal: "transaction",
      timeline: [
        makeEvent({ id: "c", kind: "click", text: "Place order", score: 3 }),
        makeEvent({
          id: "n",
          kind: "network",
          method: "POST",
          url: "https://shop.example.com/api/checkout",
          status: 200,
          resBody: JSON.stringify({ order_id: "T1", total: 84 }),
          score: 6,
        }),
        makeEvent({
          id: "d",
          kind: "datalayer",
          data: { event: "purchase", ecommerce: { transaction_id: "T1", value: 84 } },
          score: 8,
        }),
        makeEvent({
          id: "d2",
          kind: "datalayer",
          data: { event: "purchase", ecommerce: { transaction_id: "T1", value: 84 } },
          score: 8,
        }),
        makeEvent({ id: "t", kind: "network", category: "tracker", summary: "tracker sent transaction", score: 2 }),
      ],
    });
    const candidates = suggestCandidates(session);
    expect(candidates[0].event.id).toBe("d");
    expect(candidates[0].reason).toContain("data layer");
    expect(candidates[0].facts).toBe("Order T1 · $84.00");
    expect(candidates.map((c) => c.event.kind)).toEqual(["datalayer", "network"]); // deduped by kind, click not a candidate
  });

  test("for sign-ups the submitted form outranks the POST that carried it", () => {
    const session = makeSession({
      goal: "signup",
      timeline: [
        makeEvent({
          id: "n",
          kind: "network",
          method: "POST",
          url: "https://shop.example.com/api/signup",
          status: 200,
          reqBody: '{"email":"j***@e***.com"}',
          score: 5,
        }),
        makeEvent({
          id: "f",
          kind: "form",
          fields: [{ name: "email", type: "email", value: "j***@e***.com" }],
          score: 4,
        }),
      ],
    });
    expect(suggestCandidates(session)[0].event.id).toBe("f");
  });

  test("suggests nothing when nothing looks like the goal", () => {
    const session = makeSession({
      goal: "signup",
      timeline: [makeEvent({ kind: "click", text: "Menu" }), makeEvent({ kind: "storage", key: "cart" })],
    });
    expect(suggestCandidates(session)).toEqual([]);
  });
});
