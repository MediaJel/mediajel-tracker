import { describe, expect, test } from "bun:test";

import {
  AssistantReadiness,
  BACK_EDGES,
  STEP_ORDER,
  canDeploy,
  canGenerate,
  canTransition,
  transition,
} from "@mediajel/assistant-core/state/machine";
import { WidgetStep } from "@mediajel/assistant-core/types";

const forwardPairs = STEP_ORDER.slice(0, -1).map((from, i) => [from, STEP_ORDER[i + 1]] as [WidgetStep, WidgetStep]);

describe("step order", () => {
  test("is the work order, home through done", () => {
    expect(STEP_ORDER).toEqual(["home", "recording", "review", "generating", "result", "verify", "deploy", "done"]);
  });

  test("settings is an overlay, never a step", () => {
    expect(STEP_ORDER).not.toContain("settings" as WidgetStep);
  });
});

describe("canTransition", () => {
  test.each(forwardPairs)("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  test.each(BACK_EDGES as unknown as [WidgetStep, WidgetStep][])("allows the %s -> %s way back", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  test.each([
    ["home", "review"],
    ["home", "deploy"],
    ["recording", "generating"],
    ["result", "deploy"],
    ["review", "result"],
  ] as [WidgetStep, WidgetStep][])("refuses the skip %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  test.each([
    ["verify", "review"],
    ["deploy", "verify"],
    ["done", "deploy"],
    ["review", "home"],
  ] as [WidgetStep, WidgetStep][])("refuses the undocumented way back %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });

  test("lets any step start over, but only once the reset is confirmed", () => {
    for (const from of STEP_ORDER) {
      expect(canTransition(from, "home", { confirmed: true })).toBe(true);
    }
    expect(canTransition("deploy", "home")).toBe(false);
  });

  test("treats staying put as a no-op rather than an illegal move", () => {
    for (const step of STEP_ORDER) expect(canTransition(step, step)).toBe(true);
  });
});

describe("transition", () => {
  test("returns the next step when the move is allowed", () => {
    expect(transition("review", "generating")).toBe("generating");
  });

  test("stays where it is rather than throwing on a client's page", () => {
    expect(transition("home", "deploy")).toBe("home");
    expect(transition("done", "recording")).toBe("done");
  });

  test("goes home once the reset is confirmed", () => {
    expect(transition("verify", "home")).toBe("verify");
    expect(transition("verify", "home", { confirmed: true })).toBe("home");
  });
});

const readiness = (patch: Partial<AssistantReadiness> = {}): AssistantReadiness => ({
  signedIn: false,
  acknowledgedDataSharing: false,
  ...patch,
});

describe("canGenerate", () => {
  test("needs a signed-in account and the data-sharing acknowledgement", () => {
    expect(canGenerate(readiness({ signedIn: true, acknowledgedDataSharing: true }))).toBe(true);
  });

  test.each([
    ["nobody signed in", readiness({ acknowledgedDataSharing: true })],
    ["no acknowledgement", readiness({ signedIn: true })],
    ["neither", readiness()],
  ])("refuses with %s", (_label, value) => {
    expect(canGenerate(value)).toBe(false);
  });
});

describe("canDeploy", () => {
  test("needs a signed-in account — the service holds the deploy credential", () => {
    expect(canDeploy(readiness({ signedIn: true }))).toBe(true);
  });

  test("refuses with nobody signed in", () => {
    expect(canDeploy(readiness())).toBe(false);
  });

  test("does not care about the acknowledgement — that is Generate's concern", () => {
    expect(canDeploy(readiness({ signedIn: true, acknowledgedDataSharing: false }))).toBe(true);
  });
});
