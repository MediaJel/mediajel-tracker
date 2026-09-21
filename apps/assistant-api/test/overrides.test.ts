import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import * as ts from "typescript";

import {
  blockAppIds,
  carryBlocks,
  planOverrides,
  regionOf,
  renderBlock,
  splice,
  withoutBlocks,
} from "~/features/integrations-assistant/services/overrides-block";

/**
 * The block that carries a tag's edited configuration into its app-id file.
 *
 * The promise is "non-breaking": whatever the frictionless files already put in `window.overrides`,
 * the edited tag ends up running with exactly what it ran with before, plus the edits — and every
 * other tag on the page with exactly its own params, as before. The harness below proves that by
 * running the rendered block against a copy of the tag's own selection logic, for every shape the
 * repo uses, then comparing what each tag would run with.
 */

// ---- the tag's own selection, copied from apps/tracker/src/index.ts --------------------------------

type Params = Record<string, unknown>;
interface Page {
  overrides?: unknown;
  scripts: string[];
}

const fromArray = (current: Params[], context: Params): Params =>
  current.find((entry) => entry.tag === context.appId || entry.appId === context.appId) ?? {};

const fromObject = (current: Record<string, Params>, context: Params): Params =>
  context.appId && current[context.appId as string] ? current[context.appId as string] : current;

/** The tag's own Dstillery defaults, applied only when nothing set `window.overrides` at all. */
const tagDefaults = (context: Params): Params => ({
  ...(context["s3.pv"] ? {} : { "s3.pv": "00000" }),
  ...(context["s3.tr"] ? {} : { "s3.tr": "00000" }),
});

const selected = (current: unknown, context: Params): Params => {
  if (!current) return tagDefaults(context);
  if (Array.isArray(current)) return fromArray(current, context);
  return typeof current === "object" ? fromObject(current as Record<string, Params>, context) : {};
};

/** What a tag runs with: its URL's params, then whatever `window.overrides` gives it. */
const runsWith = (win: { overrides?: unknown }, context: Params): Params => ({
  ...context,
  ...selected(win.overrides, context),
});

/** The params only: the whole-object fallback also spreads other tags' keyed entries, which are objects, not params. */
const params = (effective: Params): Params =>
  Object.fromEntries(Object.entries(effective).filter(([, value]) => typeof value !== "object"));

test("the copied selection is still the tag's own", () => {
  const source = readFileSync(join(__dirname, "../../tracker/src/index.ts"), "utf8");
  for (const line of [
    "if (Array.isArray(window.overrides)) {",
    "(override) => override.tag === context.appId || override.appId === context.appId,",
    "if (context.appId && window.overrides[context.appId]) {",
    "overrides = window.overrides;",
    '...(context["s3.pv"] ? {} : { "s3.pv": "00000" }),',
    "const modifiedContext = { ...context, ...overrides };",
  ]) {
    expect(source).toContain(line);
  }
});

// ---- running a block on a page ----------------------------------------------------------------------

const TAG = "5f976cbb-7d29-46ce-bf07-0f701478d800";
const OTHER = "e64cabc8-1336-429e-ba66-3b04d80c9777";

const scriptFor = (appId: string, extra = ""): string => `https://tags.cnna.io/?appId=${appId}&version=2${extra}`;

/** Runs the file's code (a frictionless file's own statements), then the block, on a page of its own. */
const run = (page: Page, before: string, block: string): { win: { overrides?: unknown }; warned: unknown[] } => {
  const warned: unknown[] = [];
  const win: { overrides?: unknown; console: { warn: (...args: unknown[]) => void } } = {
    overrides: page.overrides,
    console: { warn: (...args) => warned.push(args) },
  };
  const document = { getElementsByTagName: () => page.scripts.map((src) => ({ src })) };
  new Function("window", "document", `${before}\n${block}`)(win, document);
  return { win, warned };
};

const contextOf = (appId: string, url: Params = {}): Params => ({
  appId,
  version: "2",
  environment: "production",
  ...url,
});

/** What a tag runs with after the file's own code alone, and after the file plus the block. */
const compare = (page: Page, before: string, appId: string, edits: Record<string, string>, context: Params) => {
  const without = run(page, before, "").win;
  const withBlock = run(page, before, renderBlock(appId, edits)).win;
  return { before: params(runsWith(without, context)), after: params(runsWith(withBlock, context)) };
};

describe("what the edited tag runs with: what it ran with, plus the edits", () => {
  const edits = { "s3.pv": "Terrabis-S3.PV", environment: "jane" };
  const shapes: [string, string, Params][] = [
    ["no overrides at all", "", contextOf(TAG)],
    ["no overrides, with s3 on the URL", "", contextOf(TAG, { "s3.pv": "Url-PV", "s3.tr": "Url-TR" })],
    // src/app-ids/04857ab9-4152-4f57-a1d0-07526232ca90.ts
    [
      "a flat object (most app-id files)",
      'window.overrides = {}; var overrides = { "s2.pv": "test1", "s2.tr": "test2", "s3.pv": "test3" }; window.overrides = overrides;',
      contextOf(TAG),
    ],
    // src/domains/www.thefreedommarkets.com.ts, with this tag as the key
    [
      "an entry keyed by this tag",
      `window.overrides = {}; window.overrides["${TAG}"] = { environment: "dutchie", s1: "FFzc", "s3.pv": "FreedomMarket-S3_PV" };`,
      contextOf(TAG),
    ],
    // src/domains/www.mjintegrations.com.ts: keyed, but for other tags
    [
      "entries keyed for other tags only",
      'window.overrides = {}; window.overrides["teststagingtag"] = { "s3.pv": "44444abcd" }; window.overrides["teststagingtag1"] = { "s3.pv": "000abcd" };',
      contextOf(TAG),
    ],
    // src/domains/terrabis.co.ts: flat, and it rewrites the reported appId
    [
      "a flat object that rewrites the reported appId",
      `window.overrides = {}; window.overrides = { environment: "jane", appId: "${OTHER}", plugin: "googleAds", conversionId: "AW-17979043318" };`,
      contextOf(TAG),
    ],
    [
      "the old array, with this tag's entry",
      `window.overrides = [{ appId: "${TAG}", "s2.pv": "old" }];`,
      contextOf(TAG),
    ],
    ["the old array, without it", `window.overrides = [{ tag: "${OTHER}", "s2.pv": "theirs" }];`, contextOf(TAG)],
  ];

  for (const [name, code, context] of shapes) {
    test(name, () => {
      const page = { scripts: [scriptFor(TAG, context["s3.pv"] ? "&s3.pv=Url-PV&s3.tr=Url-TR" : "")] };
      const { before, after } = compare(page, code, TAG, edits, context);
      expect(after).toEqual({ ...before, ...edits });
    });
  }
});

describe("what every other tag on the page runs with: exactly what it ran with", () => {
  const edits = { "s3.pv": "Edited" };
  const shapes: [string, string][] = [
    ["a flat object", 'window.overrides = { "s2.pv": "test1", "s3.pv": "test3" };'],
    ["entries keyed for both tags", `window.overrides = {}; window.overrides["${OTHER}"] = { "s3.pv": "theirs" };`],
    [
      "entries keyed for other tags only",
      'window.overrides = {}; window.overrides["teststagingtag"] = { "s3.pv": "4" };',
    ],
    ["the old array", `window.overrides = [{ tag: "${OTHER}", "s2.pv": "theirs" }];`],
  ];

  for (const [name, code] of shapes) {
    test(name, () => {
      const page = { scripts: [scriptFor(TAG), scriptFor(OTHER)] };
      const { before, after } = compare(page, code, TAG, edits, contextOf(OTHER));
      expect(after).toEqual(before);
    });
  }

  test("the one it cannot keep: with no overrides at all, the other tag's own 00000 default ends", () => {
    const page = { scripts: [scriptFor(TAG), scriptFor(OTHER)] };
    const { before, after } = compare(page, "", TAG, edits, contextOf(OTHER));
    expect(before["s3.pv"]).toBe("00000");
    expect(after["s3.pv"]).toBeUndefined();
  });
});

describe("the block itself", () => {
  test("never throws into the page: a frozen object is left as it was, and the page's console says why", () => {
    const code = 'window.overrides = Object.freeze({ "s3.pv": "frozen" });';
    const page = { scripts: [scriptFor(TAG)] };
    const { win, warned } = run(page, code, renderBlock(TAG, { "s3.pv": "Edited" }));
    expect(params(runsWith(win, contextOf(TAG)))["s3.pv"]).toBe("frozen");
    expect(warned).toHaveLength(1);
  });

  test("run twice — the deployed file and the page trying the same edit — is the same as run once", () => {
    for (const code of ["", 'window.overrides = { "s3.pv": "test3" };', `window.overrides = [{ appId: "${TAG}" }];`]) {
      const page = { scripts: [scriptFor(TAG)] };
      const block = renderBlock(TAG, { "s3.pv": "Edited", plugin: "googleAds" });
      const once = run(page, code, block).win;
      const twice = run(page, code, `${block}\n${block}`).win;
      expect(runsWith(twice, contextOf(TAG))).toEqual(runsWith(once, contextOf(TAG)));
    }
  });

  test("an empty value clears a param", () => {
    const page = { scripts: [scriptFor(TAG)] };
    const { after } = compare(page, 'window.overrides = { "s2.pv": "x" };', TAG, { "s2.pv": "" }, contextOf(TAG));
    expect(after["s2.pv"]).toBe("");
  });

  test("renders the same bytes for the same edit, whatever order the edits came in", () => {
    expect(renderBlock(TAG, { b: "2", a: "1" })).toBe(renderBlock(TAG, { a: "1", b: "2" }));
  });

  test("opens on a semicolon and its begin marker, and closes on its end marker", () => {
    const block = renderBlock(TAG, { a: "1" });
    expect(block.startsWith(`;/* mediajel-assistant:overrides ${TAG} begin`)).toBe(true);
    expect(block.endsWith(`/* mediajel-assistant:overrides ${TAG} end */`)).toBe(true);
  });

  test("escapes what could break it: quotes, a closing comment, the two line separators", () => {
    const block = renderBlock(TAG, { note: 'say "hi" */    ' });
    expect(block).not.toContain(" ");
    expect(block).not.toContain(" ");
    expect(() => new Function(block)).not.toThrow();
  });

  test("is valid TypeScript as well as JavaScript: the frictionless repo builds it as a .ts file", () => {
    const { diagnostics } = ts.transpileModule(renderBlock(TAG, { "s3.pv": "x" }), {
      reportDiagnostics: true,
      compilerOptions: { target: ts.ScriptTarget.ES2016 },
    });
    expect(diagnostics ?? []).toEqual([]);
  });
});

// ---- the splice ------------------------------------------------------------------------------------

describe("where the block goes in a file", () => {
  const block = renderBlock(TAG, { "s3.pv": "Edited" });

  test("a file that does not exist yet is the block alone", () => {
    expect(splice(null, TAG, block)).toBe(`${block}\n`);
  });

  test("below the file's own code, a line apart, every byte of the file where it was", () => {
    const file = 'const tag = () => {\n  window.overrides = { "s3.pv": "test3" };\n};\n\ntag();\n';
    const after = splice(file, TAG, block);
    expect(after.startsWith(file)).toBe(true);
    expect(after).toBe(`${file}\n${block}\n`);
  });

  /** Runs a whole file on an empty page, with `tag` as whatever the file calls. */
  const runFile = (file: string, tag: () => unknown): void =>
    new Function("tag", "window", "document", file)(tag, {}, { getElementsByTagName: () => [] });

  test("a file ending in a bare call with no semicolon is not continued into the block", () => {
    const tag = () => () => {
      throw new Error("the block was called as an argument");
    };
    expect(() => runFile(splice("tag()", TAG, block), tag)).not.toThrow();
  });

  test("a file ending in a line comment still leaves the block on a line of its own", () => {
    expect(() => runFile(splice("tag(); // done", TAG, block), () => undefined)).not.toThrow();
  });

  test("an existing block is replaced where it stands, and nothing around it moves", () => {
    const first = splice("tag();\n", TAG, renderBlock(TAG, { "s3.pv": "one" }));
    const withTail = `${first}more();\n`;
    const after = splice(withTail, TAG, block);
    expect(after).toBe(`tag();\n\n${block}\nmore();\n`);
    expect(blockAppIds(after)).toEqual([TAG]);
  });

  test("no edits take the block out again, with the blank line that set it apart", () => {
    const file = "tag();\n";
    expect(splice(splice(file, TAG, block), TAG, null)).toBe(file);
  });

  test("a file whose markers were edited by hand is refused, not guessed at", () => {
    const broken = `${block}\n`.replace(`/* mediajel-assistant:overrides ${TAG} end */`, "");
    expect(() => splice(broken, TAG, block)).toThrow("no longer pair up");
    expect(() => regionOf(`${block}\n${block}\n`, TAG)).toThrow("no longer pair up");
  });

  test("the plan for no edits and no block is the file as it is", () => {
    expect(planOverrides("tag();\n", TAG, {})).toEqual({ block: null, after: "tag();\n" });
  });
});

describe("a file replaced by the Tracking setup keeps its deployed configuration", () => {
  const block = renderBlock(TAG, { "s3.pv": "Edited" });
  const other = renderBlock(OTHER, { environment: "jane" });

  test("every block the old file carried is kept below the new code", () => {
    const previous = splice(splice("old();\n", TAG, block), OTHER, other);
    const next = carryBlocks(previous, "fresh();\n");
    expect(next.startsWith("fresh();\n")).toBe(true);
    expect(blockAppIds(next)).toEqual([TAG, OTHER]);
    expect(withoutBlocks(next)).toBe("fresh();\n");
  });

  test("a block the new file already carries is not doubled", () => {
    const previous = splice("old();\n", TAG, block);
    const next = carryBlocks(previous, splice("fresh();\n", TAG, block));
    expect(blockAppIds(next)).toEqual([TAG]);
  });

  test("a new file with nothing to carry is the new file", () => {
    expect(carryBlocks(null, "fresh();\n")).toBe("fresh();\n");
    expect(carryBlocks("old();\n", "fresh();\n")).toBe("fresh();\n");
  });
});
