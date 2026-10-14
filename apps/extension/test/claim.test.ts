import { describe, expect, test } from "bun:test";

import { claimBridge, claimRelay } from "~/bridge/claim";

/**
 * One copy of a script per page: a new copy of the same wire version stands the old one down; a
 * copy of another version is left to its own devices.
 */

describe("claiming a page", () => {
  test("a second copy of the same version disposes the first", () => {
    const win = {} as Window;
    const stood: string[] = [];
    claimBridge(win, 3, () => stood.push("first"));
    claimBridge(win, 3, () => stood.push("second"));
    expect(stood).toEqual(["first"]);
    claimBridge(win, 3, () => undefined);
    expect(stood).toEqual(["first", "second"]);
  });

  test("a copy of another version is left alone — its messages fail the wire check anyway", () => {
    const win = {} as Window;
    const stood: string[] = [];
    claimBridge(win, 2, () => stood.push("older"));
    claimBridge(win, 3, () => stood.push("newer"));
    expect(stood).toEqual([]);
  });

  test("a predecessor that throws while standing down does not stop the new copy", () => {
    const win = {} as Window;
    claimBridge(win, 3, () => {
      throw new Error("already gone");
    });
    expect(() => claimBridge(win, 3, () => undefined)).not.toThrow();
  });

  test("the relay claims its own world the same way", () => {
    const stood: string[] = [];
    claimRelay(3, () => stood.push("first"));
    claimRelay(3, () => stood.push("second"));
    expect(stood).toEqual(["first"]);
  });
});
