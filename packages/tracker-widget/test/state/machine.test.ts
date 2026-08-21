import { describe, expect, test } from "bun:test";

import { DEFAULT_SETTINGS, WidgetSettings } from "@mediajel/tracker-widget/session/settings";
import {
  BACK_EDGES,
  STEP_ORDER,
  canDeploy,
  canGenerate,
  canTransition,
  transition,
} from "@mediajel/tracker-widget/state/machine";
import { WidgetStep } from "@mediajel/tracker-widget/types";

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

const settings = (patch: Partial<WidgetSettings>): WidgetSettings => ({
  ...DEFAULT_SETTINGS,
  ...patch,
  actor: { ...DEFAULT_SETTINGS.actor, ...(patch.actor ?? {}) },
});

describe("canGenerate", () => {
  const ready = settings({ provider: "anthropic", apiKey: "sk-1", acknowledgedDataSharing: true });

  test("needs a provider, a key and the data-sharing acknowledgement", () => {
    expect(canGenerate(ready)).toBe(true);
  });

  test.each([
    ["no key", settings({ provider: "anthropic", acknowledgedDataSharing: true })],
    ["a blank key", settings({ ...ready, apiKey: "   " })],
    ["no acknowledgement", settings({ ...ready, acknowledgedDataSharing: false })],
    ["no provider", settings({ ...ready, provider: "" as WidgetSettings["provider"] })],
  ])("refuses with %s", (_label, value) => {
    expect(canGenerate(value)).toBe(false);
  });

  test("does not care about the GitHub half of the settings", () => {
    expect(canGenerate(settings({ ...ready, githubToken: "" }))).toBe(true);
  });
});

describe("canDeploy", () => {
  const ready = settings({ githubToken: "ghp_1", actor: { name: "Dana", email: "d@mediajel.com" } });

  test("needs a token and both halves of the actor", () => {
    expect(canDeploy(ready)).toBe(true);
  });

  test.each([
    ["no token", settings({ ...ready, githubToken: "" })],
    ["a blank token", settings({ ...ready, githubToken: "  " })],
    ["no name", settings({ ...ready, actor: { name: "", email: "d@mediajel.com" } })],
    ["no email", settings({ ...ready, actor: { name: "Dana", email: "" } })],
  ])("refuses with %s", (_label, value) => {
    expect(canDeploy(value)).toBe(false);
  });

  test("does not care about the model half of the settings", () => {
    expect(canDeploy(settings({ ...ready, apiKey: "", acknowledgedDataSharing: false }))).toBe(true);
  });
});
