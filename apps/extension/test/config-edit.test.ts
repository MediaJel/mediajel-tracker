import { describe, expect, test } from "bun:test";

import { TagRecord } from "@mediajel/assistant-core/tags";

import {
  changeCount,
  consequenceOf,
  editGroups,
  overridesKeyOf,
  released,
  stateOf,
  undone,
  withValue,
} from "~/ui/config-edit";

/** Editing a tag's configuration: the fields, the edit set, and what each edit does. */

const APP = "5f976cbb-7d29-46ce-bf07-0f701478d800";

const tag = (params: Record<string, string>, over: Partial<TagRecord> = {}): TagRecord => ({
  appId: APP,
  state: "sending",
  environment: "dutchie",
  version: "2",
  event: "",
  announced: false,
  firstSeenAt: 0,
  collector: "collector-azsx401.dmp.cnna.io",
  enabled: true,
  config: { params, src: `https://tags.cnna.io/?appId=${APP}&version=2`, element: "", source: "record" },
  ...over,
});

const field = (groups: ReturnType<typeof editGroups>, label: string) =>
  groups.flatMap((group) => group.fields).find((candidate) => candidate.label === label)!;

describe("the fields a tag offers", () => {
  test("every named param, set or not, in the slip's groups, and the rest under Other", () => {
    const groups = editGroups(tag({ "s3.pv": "Terrabis-PV", zeta: "1" }), { added: "x" });
    expect(groups.map((group) => group.title)).toEqual([
      "Identity",
      "Audience segments",
      "Plugins",
      "Controls",
      "Other parameters",
    ]);
    expect(field(groups, "Dstillery page-view")).toEqual({
      key: "s3.pv",
      label: "Dstillery page-view",
      now: "Terrabis-PV",
    });
    expect(field(groups, "Nexxen page-view beacon")).toEqual({
      key: "s2.pv",
      label: "Nexxen page-view beacon",
      now: "",
    });
    expect(groups.at(-1)!.fields.map((entry) => entry.key)).toEqual(["added", "zeta"]);
  });

  test("a segment read from its legacy name is edited under that name, with the name it falls back to", () => {
    const groups = editGroups(tag({ segmentId: "legacy", s1: "new" }), {});
    expect(field(groups, "LiquidM segment")).toEqual({
      key: "segmentId",
      label: "LiquidM segment",
      now: "legacy",
      legacy: "segmentId",
      fallback: "s1",
    });
  });

  test("the overrides key is the app ID the tag's URL names, even when a flat override renamed the tag", () => {
    expect(overridesKeyOf(tag({}, { appId: "renamed-by-an-override" }))).toBe(APP);
    expect(overridesKeyOf(tag({}, { config: null }))).toBe(APP);
  });
});

describe("the edit set", () => {
  const s3 = { key: "s3.pv", label: "Dstillery page-view", now: "Terrabis-PV" };

  test("a typed value is an edit; typing back what the tag runs with is none", () => {
    const edited = withValue({}, {}, s3, "Edited");
    expect(edited).toEqual({ "s3.pv": "Edited" });
    expect(withValue(edited, {}, s3, "Terrabis-PV")).toEqual({});
  });

  test("an earlier edit stays one, even at the value the tag runs with — the page runs it because of that edit", () => {
    expect(withValue({ "s3.pv": "Earlier" }, { "s3.pv": "Earlier" }, { ...s3, now: "Earlier" }, "Earlier")).toEqual({
      "s3.pv": "Earlier",
    });
  });

  test("undo puts a field back the way the editor found it; releasing drops an earlier edit's param", () => {
    const start = { "s3.pv": "Earlier" };
    expect(undone({ "s3.pv": "Changed" }, start, "s3.pv")).toEqual(start);
    expect(undone({ "s2.pv": "New" }, start, "s2.pv")).toEqual({});
    expect(released(start, "s3.pv")).toEqual({});
  });

  test("each field's standing, and how many changes a try would make", () => {
    const start = { a: "1", b: "2" };
    const draft = { a: "1", c: "3" };
    expect([
      stateOf(draft, start, "a"),
      stateOf(draft, start, "b"),
      stateOf(draft, start, "c"),
      stateOf(draft, start, "d"),
    ]).toEqual(["kept", "released", "edited", "none"]);
    expect(changeCount(draft, start)).toBe(2);
  });
});

describe("what an edit does, said before it is tried", () => {
  test("renaming the tag, redirecting it, switching it off", () => {
    expect(consequenceOf({ key: "appId", label: "App ID", now: APP }, "other")).toBe(
      "The tag reports as another app ID.",
    );
    expect(consequenceOf({ key: "collector", label: "Collector", now: "" }, "x")).toBe(
      "The tag sends to another collector.",
    );
    expect(consequenceOf({ key: "enable", label: "Enabled", now: "" }, "false")).toBe("The tag switches off.");
    expect(consequenceOf({ key: "enable", label: "Enabled", now: "" }, "true")).toBe("");
  });

  test("a value the tag already runs with says nothing, however much it could", () => {
    expect(consequenceOf({ key: "appId", label: "App ID", now: APP }, APP)).toBe("");
    expect(consequenceOf({ key: "collector", label: "Collector", now: "c.example" }, "c.example")).toBe("");
  });

  test("emptying a segment the tag also reads under another name", () => {
    expect(consequenceOf({ key: "s2.pv", label: "Nexxen page-view beacon", now: "x", fallback: "s2" }, "")).toBe(
      "Empty, so the tag reads s2 instead.",
    );
  });
});
