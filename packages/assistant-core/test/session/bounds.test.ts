import { describe, expect, test } from "bun:test";

import {
  BODY_CHAR_CAP,
  DOM_TEXT_CHAR_CAP,
  EVENT_CAP,
  EVICTION_ORDER,
  applyBounds,
  nextEvictionIndex,
  serializedSize,
} from "@mediajel/assistant-core/session/bounds";
import { TimelineEvent, WidgetSession } from "@mediajel/assistant-core/types";

import { makeEvent, makeSession } from "../helpers";

describe("applyBounds", () => {
  test("clamps a network body to BODY_CHAR_CAP and says so", () => {
    const event = makeEvent({ kind: "network", resBody: "x".repeat(BODY_CHAR_CAP + 500) });

    const bounded = applyBounds(event);

    expect(bounded.kind).toBe("network");
    if (bounded.kind !== "network") throw new Error("unreachable");
    expect(bounded.resBody.length).toBe(BODY_CHAR_CAP);
    expect(bounded.resBody.endsWith("…")).toBe(true);
  });

  test("clamps request bodies too", () => {
    const event = makeEvent({ kind: "network", reqBody: "y".repeat(BODY_CHAR_CAP * 2) });
    const bounded = applyBounds(event);
    if (bounded.kind !== "network") throw new Error("unreachable");
    expect(bounded.reqBody.length).toBe(BODY_CHAR_CAP);
  });

  test("clamps DOM item text to DOM_TEXT_CHAR_CAP", () => {
    const event = makeEvent({
      kind: "dom",
      items: [{ selector: "#total", text: "z".repeat(DOM_TEXT_CHAR_CAP + 40) }],
    });

    const bounded = applyBounds(event);
    if (bounded.kind !== "dom") throw new Error("unreachable");
    expect(bounded.items[0].text.length).toBe(DOM_TEXT_CHAR_CAP);
    expect(bounded.items[0].selector).toBe("#total");
  });

  test("returns the very same object when nothing needed clamping", () => {
    // The store re-runs this over the whole timeline on every update; identity is what keeps
    // that cheap and keeps subscribers from seeing spurious changes.
    const event = makeEvent({ kind: "click", text: "Place order" });
    expect(applyBounds(event)).toBe(event);
  });

  test("leaves a summary alone even when it is long", () => {
    const summary = "s".repeat(BODY_CHAR_CAP + 10);
    const event = makeEvent({ kind: "click", summary });
    expect(applyBounds(event).summary).toBe(summary);
  });
});

describe("nextEvictionIndex", () => {
  const withTimeline = (timeline: TimelineEvent[], markedIds: string[] = []): WidgetSession =>
    makeSession({ timeline, markedIds });

  test("drops in the documented order: dom, click, storage, message, then network", () => {
    const session = withTimeline([
      makeEvent({ id: "n1", kind: "network" }),
      makeEvent({ id: "m1", kind: "message" }),
      makeEvent({ id: "s1", kind: "storage" }),
      makeEvent({ id: "c1", kind: "click" }),
      makeEvent({ id: "d1", kind: "dom" }),
    ]);

    const dropped: string[] = [];
    for (;;) {
      const index = nextEvictionIndex(session);
      if (index === -1) break;
      dropped.push(session.timeline[index].id);
      session.timeline.splice(index, 1);
    }

    expect(dropped).toEqual(["d1", "c1", "s1", "m1", "n1"]);
  });

  test("evicts the oldest event of a kind first", () => {
    const session = withTimeline([
      makeEvent({ id: "old", kind: "dom", t: 10 }),
      makeEvent({ id: "new", kind: "dom", t: 20 }),
    ]);
    expect(session.timeline[nextEvictionIndex(session)].id).toBe("old");
  });

  test("never evicts a marked event", () => {
    const session = withTimeline(
      [makeEvent({ id: "keep", kind: "dom" }), makeEvent({ id: "drop", kind: "dom" })],
      ["keep"],
    );
    expect(session.timeline[nextEvictionIndex(session)].id).toBe("drop");
  });

  test("returns -1 when only unevictable kinds are left", () => {
    const session = withTimeline([
      makeEvent({ id: "p1", kind: "page" }),
      makeEvent({ id: "f1", kind: "form" }),
      makeEvent({ id: "dl", kind: "datalayer" }),
      makeEvent({ id: "nv", kind: "nav" }),
      makeEvent({ id: "pf", kind: "platform" }),
    ]);
    expect(nextEvictionIndex(session)).toBe(-1);
  });

  test("returns -1 when every evictable event is marked", () => {
    const session = withTimeline([makeEvent({ id: "d1", kind: "dom" })], ["d1"]);
    expect(nextEvictionIndex(session)).toBe(-1);
  });

  test("EVICTION_ORDER is the contract's order and puts network last", () => {
    expect(EVICTION_ORDER).toEqual(["dom", "click", "storage", "message", "network"]);
  });
});

describe("caps", () => {
  test("EVENT_CAP is 400 and the body/DOM caps match the contract", () => {
    expect(EVENT_CAP).toBe(400);
    expect(BODY_CHAR_CAP).toBe(2048);
    expect(DOM_TEXT_CHAR_CAP).toBe(160);
  });

  test("serializedSize counts what the browser charges against the quota", () => {
    const session = makeSession({ timeline: [] });
    expect(serializedSize(session)).toBe(JSON.stringify(session).length);
  });
});

import { SESSION_SERIALIZED_CAP } from "@mediajel/assistant-core/session/bounds";

test("the serialized cap is the contract's 1.5 MB figure", () => {
  expect(SESSION_SERIALIZED_CAP).toBe(1_500_000);
});
