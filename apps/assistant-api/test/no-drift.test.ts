import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Two blocks in this module are deliberate copies of code in `@mediajel/assistant-core`, and
 * this file exists to make sure they stay copies rather than becoming variants.
 *
 * Why copy at all: the module is written to be lifted into
 * amplication-nestjs-microservices, where `@mediajel/assistant-core` does not exist. A runtime
 * import across that boundary would have to be unpicked at exactly the moment the move happens.
 * So the module carries its own, and this test carries the cost of that decision.
 *
 * Why it matters more than tidiness:
 *
 *   rewrite-imports  — the extension rewrites a tag to VERIFY it on the page; the service
 *                      rewrites the same tag to PARSE-CHECK it before committing. If those two
 *                      disagree, a file can verify clean in the browser and still be refused at
 *                      deploy, or — far worse — pass the deploy gate on a parser the operator
 *                      never ran. The allowlist is a security boundary; two allowlists is a hole.
 *
 *   GenerationSchema — the service produces it, the extension parses it. A field added on one
 *                      side is a generate that succeeds on the server and is rejected in the
 *                      panel as "does not match the tag contract".
 *
 * If this fails: do not edit one side to match. Decide which is correct, change both, and say
 * in the commit why they moved together.
 */

// `__dirname`, not `import.meta`: this app compiles to CommonJS for Nest's decorator metadata.
const CORE = join(__dirname, "../../../packages/assistant-core/src");
const HERE = join(__dirname, "../src/features/integrations-assistant");

/**
 * Read a copy, ignoring which symbols each side chooses to export.
 *
 * The export surface legitimately differs — assistant-core publishes these to the extension,
 * this module keeps all but two of them internal — and that difference is not drift. Anything
 * else changing is.
 */
const read = (path: string): string => readFileSync(path, "utf8").replace(/^export (?=const |interface |type )/gm, "");

/** Everything after the file's own header comment — the copies differ only in that header. */
const body = (source: string, marker: string): string => source.slice(source.indexOf(marker));

/** One exported const declaration, by name — object literal or call, either terminator. */
const block = (source: string, name: string): string => {
  // The name may carry a type annotation before the `=`, so match the declaration only.
  // `read` has already stripped the `export ` prefixes.
  const start = source.indexOf(`const ${name}`);
  expect(start).toBeGreaterThan(-1);
  const ends = ["\n});", "\n};"].map((t) => source.indexOf(t, start)).filter((i) => i > start);
  expect(ends.length).toBeGreaterThan(0);
  const end = Math.min(...ends);
  return source.slice(start, source.indexOf(";", end) + 1);
};

describe("the copies this module carries", () => {
  test("rewrite-imports is byte-identical to the one the extension verifies with", () => {
    const mine = read(join(HERE, "services/rewrite-imports.ts"));
    const theirs = read(join(CORE, "verify/rewrite-imports.ts"));

    expect(body(mine, "/** The only specifiers")).toBe(body(theirs, "/** The only specifiers"));
  });

  test("the import allowlist itself has not drifted — it is the security boundary", () => {
    const mine = read(join(HERE, "services/rewrite-imports.ts"));
    const theirs = read(join(CORE, "verify/rewrite-imports.ts"));

    expect(block(mine, "IMPORT_ALLOWLIST")).toBe(block(theirs, "IMPORT_ALLOWLIST"));
  });

  test("GenerationSchema is byte-identical to the one the extension parses with", () => {
    const mine = read(join(HERE, "dto/generate.dto.ts"));
    const theirs = read(join(CORE, "ai/schema.ts"));

    expect(block(mine, "GenerationSchema")).toBe(block(theirs, "GenerationSchema"));
  });
});
