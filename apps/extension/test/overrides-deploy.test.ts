import { describe, expect, test } from "bun:test";

import type { OverridesPreview } from "~/service/client";
import { deployLine, triedLine } from "~/ui/overrides-deploy";

/** The sentence a deploy is summed up in, and the words beside a slip whose edit is being tried. */

const preview = (over: Partial<OverridesPreview> = {}): OverridesPreview => ({
  path: "src/app-ids/5f976cbb.ts",
  exists: true,
  sha: "abc",
  before: "const tag = () => {\n  window.overrides = {};\n};\n\ntag();\n",
  after: "",
  block: ";/* the block */",
  version: "v-0000abcd",
  deployed: null,
  changed: true,
  ...over,
});

describe("what a deploy does to the file", () => {
  test("adds the edit below the file's own code, and says how much of it stays", () => {
    expect(deployLine(preview())).toBe(
      "Adds the edit below the file’s 5 lines of its own code, which stay as they are.",
    );
  });

  test("creates the file, replaces an earlier edit, or takes it out", () => {
    expect(deployLine(preview({ exists: false, before: "" }))).toBe("Creates the file, holding only the edit.");
    expect(deployLine(preview({ deployed: { "s3.pv": "Earlier" } }))).toBe(
      "Replaces the edit deployed before; the file’s own code stays as it is.",
    );
    expect(deployLine(preview({ block: null, deployed: { "s3.pv": "Earlier" } }))).toBe(
      "Takes the edit deployed before out of the file; its own code stays as it is.",
    );
  });
});

describe("what the slip says about an edit being tried", () => {
  const tried = { edits: { a: "1", b: "2" }, block: ";", version: "v-0000abcd" };

  test("how many params the edit changes from the tag's own, one, or none", () => {
    expect(triedLine(tried)).toBe("2 changes tried on this page");
    expect(triedLine({ ...tried, edits: { a: "1" } })).toBe("1 change tried on this page");
    expect(triedLine(undefined)).toBe("");
  });

  test("trying the file without an earlier edit, and an edit already committed", () => {
    expect(triedLine({ ...tried, edits: {}, block: "" })).toBe("trying the file without the edit deployed before");
    expect(triedLine({ ...tried, deployed: { commitUrl: "c", fileUrl: "f", at: 0 } })).toBe(
      "edit deployed · the page runs it until the tag’s CDN serves it",
    );
  });
});
