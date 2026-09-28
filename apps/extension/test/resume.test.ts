import { describe, expect, test } from "bun:test";

import { WidgetSession } from "@mediajel/assistant-core/types";

import { resumption } from "~/background/resume";

/** A new document in a tab mid-job: what it is told, and what it is not. */

const session = (over: Partial<WidgetSession>): WidgetSession =>
  ({
    v: 1,
    id: "s1",
    goal: "transaction",
    step: "home",
    startedAt: 1_000,
    pages: [],
    timeline: [],
    markedIds: [],
    ...over,
  }) as WidgetSession;

describe("resumption", () => {
  test("a recording picks up from where the clock was", () => {
    expect(resumption(session({ step: "recording", startedAt: 42 }))).toEqual({
      type: "start-recording",
      startedAt: 42,
    });
  });

  test("a proof runs again with the generated tag", () => {
    const generation = { code: "window.trackTrans({})" } as WidgetSession["generation"];
    expect(resumption(session({ step: "verify", generation }))).toEqual({
      type: "verify",
      code: "window.trackTrans({})",
    });
    expect(resumption(session({ step: "verify" }))).toBeNull();
  });

  test("any other step, or no job, has nothing to resume", () => {
    expect(resumption(session({ step: "review" }))).toBeNull();
    expect(resumption(null)).toBeNull();
  });
});
