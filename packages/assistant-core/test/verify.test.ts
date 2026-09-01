import { describe, expect, test } from "bun:test";

import { InterceptedCall, installVerifyInterceptor } from "@mediajel/assistant-core/verify/interceptor";
import { checkPayload } from "@mediajel/assistant-core/verify/payload-check";
import { runGenerated } from "@mediajel/assistant-core/verify/runner";

import { REAL_DATALAYER_TAG, makeEvent } from "./helpers";

describe("interceptor", () => {
  test("captures without forwarding, absorbs late assignments, and flags replays", () => {
    const interceptor = installVerifyInterceptor();
    const calls: InterceptedCall[] = [];
    interceptor.onCapture((call) => calls.push(call));

    // The adapters chunk assigning the real function later must not displace the wrapper.
    (window as unknown as Record<string, unknown>).trackTrans = () => {
      throw new Error("the real function must never run during verify");
    };

    window.trackTrans({ id: "T1" } as never);
    interceptor.setReplaying(true);
    window.trackTrans({ id: "T2" } as never);
    interceptor.setReplaying(false);

    expect(calls).toHaveLength(2);
    expect(calls[0].name).toBe("trackTrans");
    expect(calls[0].fromReplay).toBe(false);
    expect(calls[1].fromReplay).toBe(true);
  });
});

describe("runGenerated", () => {
  test("injects the rewritten dataLayer template and captures the purchase it fires", () => {
    (window as unknown as { dataLayer: unknown[] }).dataLayer = [
      {
        event: "purchase",
        ecommerce: {
          transaction_id: 9910,
          value: "84",
          tax: "6.3",
          shipping: "5",
          items: [{ item_id: "SKU1", item_name: "OG Kush", item_category: "Flower", price: 45, quantity: 1 }],
        },
      },
    ];

    const captures: InterceptedCall[] = [];

    const result = runGenerated(
      REAL_DATALAYER_TAG,
      (call) => captures.push(call),
      (js) => new Function(js)(),
    );

    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(captures.length).toBeGreaterThan(0);
    const payload = captures[0].payload as { id: string; total: number; items: unknown[] };
    expect(payload.id).toBe("9910");
    expect(payload.total).toBe(84);
    expect(payload.items).toHaveLength(1);
    expect(captures[0].fromReplay).toBe(true); // it fired from the pre-existing entry
  });

  test("refuses code that fails the gates before touching the page", () => {
    const { ok, errors } = runGenerated(`const t = (x: string) => x;`, () => undefined);
    expect(ok).toBe(false);
    expect(errors.some((error) => error.includes("SyntaxError"))).toBe(true);
  });
});

describe("checkPayload", () => {
  const marked = [makeEvent({ id: "m1", kind: "datalayer", summary: "purchase T77" })];

  test("passes a complete transaction and traces its id to the evidence", () => {
    const verdict = checkPayload(
      {
        name: "trackTrans",
        at: 0,
        fromReplay: false,
        payload: {
          id: "T77", // appears in the pinned event's summary
          total: 84,
          tax: 6.3,
          shipping: 5,
          city: "N/A",
          state: "N/A",
          country: "N/A",
          currency: "USD",
          items: [{ orderId: "T77", sku: "S", name: "N", category: "C", unitPrice: 45, quantity: 1, currency: "USD" }],
        },
      },
      "transaction",
      marked,
    );
    expect(verdict.ok).toBe(true);
    expect(verdict.hints.some((hint) => hint.includes("matches the pinned evidence"))).toBe(true);
  });

  test("names each missing/invalid field as a problem", () => {
    const verdict = checkPayload(
      { name: "trackTrans", at: 0, fromReplay: false, payload: { id: "", total: Number.NaN, items: "no" } },
      "transaction",
      marked,
    );
    expect(verdict.ok).toBe(false);
    expect(verdict.problems.length).toBeGreaterThan(2);
  });

  test("sign-ups need a uuid and one of the email fields", () => {
    const bad = checkPayload({ name: "trackSignUp", at: 0, fromReplay: false, payload: { uuid: "u" } }, "signup", []);
    expect(bad.ok).toBe(false);
    const good = checkPayload(
      { name: "trackSignUp", at: 0, fromReplay: false, payload: { uuid: "u", hashedEmailAddress: "abc" } },
      "signup",
      [],
    );
    expect(good.ok).toBe(true);
  });
});
