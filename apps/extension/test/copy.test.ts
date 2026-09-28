import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * Nothing the panel says asks the operator to reload a page: detection attaches, listens and
 * re-reads on its own. (Reloading the extension itself, after an update left a panel newer than
 * its background, is a different matter and keeps its sentence.)
 */

const sources = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });

describe("the panel's copy", () => {
  test("never asks for the page to be reloaded", () => {
    const offenders = sources(new URL("../src", import.meta.url).pathname).filter((path) =>
      /reload (the page|it and try again|this page)/i.test(readFileSync(path, "utf8")),
    );
    expect(offenders).toEqual([]);
  });
});
